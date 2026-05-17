import { NextResponse } from 'next/server';
import { cloneRepository, getRepositoryFiles, readFileContent, cleanupRepository } from '@/lib/github/clone';
import { analyzeFileStatic, analyzePackageJson } from '@/lib/analyzers/static';
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit';
import { generateAdditionalIssues } from '@/lib/gemini/client';
import crypto from 'crypto';
import { createLogger } from '@/lib/logger';

const logger = createLogger('scan');

// Shared scan results store
if (!globalThis.__scanResults) {
  globalThis.__scanResults = new Map();
}
const scanResults = globalThis.__scanResults;

// Clean up old scans (> 30 min) to avoid memory leaks
function pruneOldScans() {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, scan] of scanResults.entries()) {
    const ts = parseInt(id.split('_')[1] || '0', 10);
    if (ts < cutoff) scanResults.delete(id);
  }
}

export async function POST(request) {
  // Rate limit: 30 scans per minute per IP
  const rl = rateLimit(request, { limit: 30, windowMs: 60_000 });
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many scans. Please wait a moment before trying again.' },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders(rl),
          'Retry-After': String(rl.reset - Math.floor(Date.now() / 1000)),
        },
      }
    );
  }

  try {
    pruneOldScans();
    const { repoUrl, githubToken, aiKey } = await request.json();

    if (!repoUrl) {
      return NextResponse.json(
        { error: 'Repository URL is required' },
        { status: 400, headers: rateLimitHeaders(rl) }
      );
    }

    // Generate scan ID using a cryptographically secure random number to mitigate IDOR
    const scanId = `scan_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;

    // Initialize scan status
    scanResults.set(scanId, {
      status: 'cloning',
      progress: 0,
      message: 'Cloning repository...',
      results: [],
    });

    // Start scanning in background (don't await)
    scanRepository(scanId, repoUrl, githubToken, aiKey).catch((err) => {
      logger.error('Background scan error', err);
    });

    return NextResponse.json(
      { scanId, status: 'started', message: 'Scan started successfully' },
      { headers: rateLimitHeaders(rl) }
    );
  } catch (error) {
    logger.error('Scan error', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start scan' },
      { status: 500 }
    );
  }
}

async function scanRepository(scanId, repoUrl, githubToken, aiKey) {
  let repoPath = null;

  try {
    // Clone repository
    const { path: clonedPath, owner, repo } = await cloneRepository(repoUrl, githubToken);
    repoPath = clonedPath;

    scanResults.set(scanId, {
      status: 'scanning',
      progress: 20,
      message: 'Repository cloned. Discovering files...',
      results: [],
      repository: { owner, repo },
    });

    // Get all code files
    const files = await getRepositoryFiles(clonedPath);

    // Cap at 150 files for performance (up from 100)
    const filesToScan = files.slice(0, 150);

    scanResults.set(scanId, {
      ...scanResults.get(scanId),
      progress: 30,
      message: `Found ${files.length} files. Analyzing${files.length > 150 ? ' (first 150)' : ''}...`,
      totalFiles: filesToScan.length,
    });

    // Analyze files — batch in groups of 10 for better throughput
    const allIssues = [];
    let processedFiles = 0;
    const BATCH = 10;

    for (let i = 0; i < filesToScan.length; i += BATCH) {
      const batch = filesToScan.slice(i, i + BATCH);

      await Promise.all(
        batch.map(async (file) => {
          try {
            const content = await readFileContent(file.fullPath);
            if (content && content.length < 100000) {
              let issues;
              if (file.name === 'package.json') {
                issues = await analyzePackageJson(content, file.path);
              } else {
                issues = analyzeFileStatic(content, file.path);
              }
              if (issues && issues.length > 0) {
                allIssues.push(...issues);
              }
            }
          } catch (err) {
            logger.error(`Error analyzing file ${file.path}`, err);
          } finally {
            processedFiles++;
          }
        })
      );

      const progress = 30 + Math.floor((processedFiles / filesToScan.length) * 65);
      scanResults.set(scanId, {
        ...scanResults.get(scanId),
        progress: Math.min(progress, 95),
        message: `Analyzed ${processedFiles}/${filesToScan.length} files...`,
      });
    }

    // Deduplicate by (file + line + title)
    const seen = new Set();
    const unique = allIssues.filter((issue) => {
      const key = `${issue.file}:${issue.line}:${issue.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    unique.sort((a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4));

    // Scan complete (Static part)
    scanResults.set(scanId, {
      status: 'completed',
      progress: 100,
      message: `Static scan completed. Found ${unique.length} issues in ${processedFiles} files. Running AI deep scan in background...`,
      results: [...unique],
      repository: { owner, repo },
      totalFiles: filesToScan.length,
      completedAt: new Date().toISOString(),
    });

    // Run AI in background asynchronously without blocking the UI
    (async () => {
      try {
        const aiIssues = await generateAdditionalIssues(filesToScan, unique, aiKey);
        if (aiIssues && aiIssues.length > 0) {
          const currentResult = scanResults.get(scanId);
          if (!currentResult) return;
          
          let aiAdded = 0;
          for (const aiIssue of aiIssues) {
            const key = `${aiIssue.file}:${aiIssue.line}:${aiIssue.title}`;
            if (!seen.has(key)) {
              unique.push(aiIssue);
              seen.add(key);
              aiAdded++;
            }
          }
          if (aiAdded > 0) {
            unique.sort((a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4));
            scanResults.set(scanId, {
              ...currentResult,
              results: [...unique],
              message: `Scan completed. Found ${unique.length} issues (including ${aiAdded} AI findings).`,
            });
          }
        }
      } catch (err) {
        logger.warn('AI analysis step failed or skipped', err);
      } finally {
        await cleanupRepository(repoPath);
      }
    })();

  } catch (error) {
    logger.error('Scan error', error);

    scanResults.set(scanId, {
      status: 'failed',
      progress: 0,
      message: error.message || 'Scan failed',
      error: error.message,
    });

    if (repoPath) {
      await cleanupRepository(repoPath).catch(() => {});
    }
  }
}

export async function GET(request) {
  // Rate limit status polling: 120 req/min
  const rl = rateLimit(request, { limit: 120, windowMs: 60_000 });

  const { searchParams } = new URL(request.url);
  const scanId = searchParams.get('scanId');

  if (!scanId) {
    return NextResponse.json({ error: 'Scan ID is required' }, { status: 400 });
  }

  const result = scanResults.get(scanId);
  if (!result) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  }

  return NextResponse.json(result, { headers: rateLimitHeaders(rl) });
}
