/**
 * Repository fetching via the GitHub REST API.
 *
 * This replaces the previous `simple-git` clone approach, which relied on a
 * local `git` binary.  Vercel serverless functions do NOT ship `git`, so we
 * now fetch the full repo tree and individual file contents through the API.
 *
 * Flow:
 *   1. GET /repos/{owner}/{repo}               → resolve default branch
 *   2. GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1  → full tree
 *   3. For each code file → GET /repos/{owner}/{repo}/contents/{path}
 */

import path from 'path';
import { createLogger } from '@/lib/logger';

const logger = createLogger('clone');

// ── Helpers ────────────────────────────────────────────────

function githubHeaders(token) {
  const h = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'Synkro-App',
  };
  if (token?.trim()) h.Authorization = `token ${token}`;
  return h;
}

function parseRepoUrl(repoUrl) {
  const m = repoUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (!m) throw new Error('Invalid GitHub repository URL');
  return { owner: m[1], repo: m[2] };
}

// ── Public API ─────────────────────────────────────────────

/**
 * "Clone" a repository by fetching its tree via the GitHub API.
 * Returns owner, repo, and the default branch – no local filesystem needed.
 */
export async function cloneRepository(repoUrl, token) {
  try {
    const { owner, repo } = parseRepoUrl(repoUrl);
    const headers = githubHeaders(token);

    // 1. Resolve default branch
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!repoRes.ok) {
      const err = await repoRes.json().catch(() => ({}));
      if (repoRes.status === 404) {
        throw new Error('Repository not found. Please check the URL and ensure the repository exists.');
      }
      if (repoRes.status === 401 || repoRes.status === 403) {
        throw new Error('Authentication failed. For private repositories, please provide a valid GitHub token.');
      }
      throw new Error(err.message || `GitHub API error (${repoRes.status})`);
    }
    const repoInfo = await repoRes.json();
    const branch = repoInfo.default_branch || 'main';

    logger.info('Resolved repository', { owner, repo, branch });

    return { owner, repo, branch };
  } catch (error) {
    logger.error('Clone error', error);

    // Re-throw user-friendly errors as-is
    if (error.message.includes('Authentication failed') ||
        error.message.includes('Repository not found') ||
        error.message.includes('Invalid GitHub')) {
      throw error;
    }
    throw new Error(`Failed to fetch repository: ${error.message}`);
  }
}

/**
 * Discover all code files in the repo via the Git Trees API (recursive).
 * Returns an array of { path, name, extension, sha }.
 */
export async function getRepositoryFiles(owner, repo, branch, token) {
  const headers = githubHeaders(token);

  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers },
  );

  if (!treeRes.ok) {
    throw new Error('Failed to fetch repository tree from GitHub');
  }

  const { tree } = await treeRes.json();

  // Skip non-code directories
  const skipDirs = new Set([
    'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
    '.cache', '.husky', '.vscode', '.idea', 'vendor', 'coverage',
    '.nyc_output', 'assets', 'static', 'public', '.github',
  ]);

  const codeExtensions = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c',
    '.cs', '.go', '.rb', '.php', '.swift', '.kt', '.rs', '.vue',
    '.html', '.css', '.scss', '.sql', '.sh', '.yaml', '.yml', '.json',
    '.mjs', '.cjs', '.svelte', '.astro',
  ]);

  const files = [];

  for (const entry of tree) {
    if (entry.type !== 'blob') continue;

    // Skip files deeper than 10 levels
    const depth = entry.path.split('/').length;
    if (depth > 10) continue;

    // Skip files inside skip directories
    const parts = entry.path.split('/');
    if (parts.some((p) => skipDirs.has(p))) continue;

    const ext = path.extname(entry.path).toLowerCase();
    if (!codeExtensions.has(ext)) continue;

    files.push({
      path: entry.path,
      name: path.basename(entry.path),
      extension: ext,
      sha: entry.sha,
    });
  }

  return files;
}

/**
 * Read a single file's content via the GitHub Contents API.
 * Returns the UTF-8 text or null on failure.
 */
export async function readFileContent(owner, repo, filePath, token) {
  try {
    const headers = githubHeaders(token);
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      { headers },
    );

    if (!res.ok) return null;

    const data = await res.json();
    if (data.encoding === 'base64' && data.content) {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }

    // For files > 1 MB, GitHub returns a download_url instead
    if (data.download_url) {
      const dlRes = await fetch(data.download_url);
      if (dlRes.ok) return await dlRes.text();
    }

    return null;
  } catch (error) {
    logger.error(`Error reading file ${filePath}`, error);
    return null;
  }
}

/**
 * No-op cleanup – we no longer write to disk.
 * Kept for backwards-compatibility with callers.
 */
export async function cleanupRepository(_repoPath) {
  // Nothing to clean up – all data was in-memory via the API.
}
