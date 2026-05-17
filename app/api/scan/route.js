import { NextResponse } from 'next/server';
import { cloneRepository, getRepositoryFiles, readFileContent, cleanupRepository } from '@/lib/github/clone';
import { analyzeFileStatic, analyzePackageJson } from '@/lib/analyzers/static';

// Shared scan results store
if (!globalThis.__scanResults) {
  globalThis.__scanResults = new Map();
}
const scanResults = globalThis.__scanResults;

export async function POST(request) {
  try {
    const { repoUrl, githubToken } = await request.json();

    if (!repoUrl) {
      return NextResponse.json(
        { error: 'Repository URL is required' },
        { status: 400 }
      );
    }

    // Generate scan ID
    const scanId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Initialize scan status
    scanResults.set(scanId, {
      status: 'cloning',
      progress: 0,
      message: 'Cloning repository...',
      results: [],
    });

    // Start scanning in background (don't await)
    scanRepository(scanId, repoUrl, githubToken).catch((err) => {
      console.error('Background scan error:', err);
    });

    return NextResponse.json({
      scanId,
      status: 'started',
      message: 'Scan started successfully',
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start scan' },
      { status: 500 }
    );
  }
}

async function scanRepository(scanId, repoUrl, githubToken) {
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

    // Cap at 100 files for performance
    const filesToScan = files.slice(0, 100);

    scanResults.set(scanId, {
      ...scanResults.get(scanId),
      progress: 30,
      message: `Found ${files.length} files. Analyzing${files.length > 100 ? ' (first 100)' : ''}...`,
      totalFiles: filesToScan.length,
    });

    // Analyze files with built-in static analyzer
    const allIssues = [];
    let processedFiles = 0;

    for (const file of filesToScan) {
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

        processedFiles++;
        const progress = 30 + Math.floor((processedFiles / filesToScan.length) * 65);

        scanResults.set(scanId, {
          ...scanResults.get(scanId),
          progress: Math.min(progress, 95),
          message: `Analyzed ${processedFiles}/${filesToScan.length} files...`,
        });
      } catch (error) {
        console.error(`Error analyzing file ${file.path}:`, error);
      }
    }

    // Deduplicate and sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    allIssues.sort((a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4));

    // Scan complete
    scanResults.set(scanId, {
      status: 'completed',
      progress: 100,
      message: `Scan completed. Found ${allIssues.length} issues in ${processedFiles} files.`,
      results: allIssues,
      repository: { owner, repo },
      totalFiles: filesToScan.length,
      completedAt: new Date().toISOString(),
    });

    // Cleanup
    await cleanupRepository(repoPath);
  } catch (error) {
    console.error('Scan error:', error);

    scanResults.set(scanId, {
      status: 'failed',
      progress: 0,
      message: error.message || 'Scan failed',
      error: error.message,
    });

    // Cleanup on error
    if (repoPath) {
      await cleanupRepository(repoPath);
    }
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const scanId = searchParams.get('scanId');

  if (!scanId) {
    return NextResponse.json(
      { error: 'Scan ID is required' },
      { status: 400 }
    );
  }

  const result = scanResults.get(scanId);

  if (!result) {
    return NextResponse.json(
      { error: 'Scan not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
