import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import os from 'os';

export async function cloneRepository(repoUrl, token) {
  try {
    // Parse GitHub URL
    const urlPattern = /github\.com\/([^\/]+)\/([^\/\.]+)/;
    const match = repoUrl.match(urlPattern);

    if (!match) {
      throw new Error('Invalid GitHub repository URL');
    }

    const [, owner, repo] = match;

    // Create temp directory for cloning (use OS temp dir to avoid polluting project)
    const tempBase = path.join(os.tmpdir(), 'synkro-scans');
    const tempDir = path.join(tempBase, `${owner}-${repo}-${Date.now()}`);

    // Ensure temp directory exists
    await fs.mkdir(tempBase, { recursive: true });

    // Clone with authentication (if token provided)
    const git = simpleGit();
    let cloneUrl;

    if (token && token.trim()) {
      cloneUrl = `https://${token}@github.com/${owner}/${repo}.git`;
    } else {
      cloneUrl = `https://github.com/${owner}/${repo}.git`;
    }

    await git.clone(cloneUrl, tempDir, ['--depth', '1', '--single-branch', '--no-tags']);

    return {
      path: tempDir,
      owner,
      repo,
    };
  } catch (error) {
    console.error('Clone error:', error);

    // Provide user-friendly error messages
    if (error.message.includes('Authentication failed') || error.message.includes('could not read Username')) {
      throw new Error('Authentication failed. For private repositories, please provide a valid GitHub token.');
    }
    if (error.message.includes('not found') || error.message.includes('Repository not found')) {
      throw new Error('Repository not found. Please check the URL and ensure the repository exists.');
    }

    throw new Error(`Failed to clone repository: ${error.message}`);
  }
}

export async function getRepositoryFiles(repoPath) {
  const files = [];

  async function scanDirectory(dir, depth = 0) {
    // Limit recursion depth
    if (depth > 10) return;

    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(repoPath, fullPath);

      // Skip common non-code directories
      const skipDirs = [
        'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
        '.cache', '.husky', '.vscode', '.idea', 'vendor', 'coverage',
        '.nyc_output', 'assets', 'static', 'public', '.github',
      ];

      if (skipDirs.includes(entry.name)) continue;

      if (entry.isDirectory()) {
        await scanDirectory(fullPath, depth + 1);
      } else if (entry.isFile()) {
        // Only include code files
        const ext = path.extname(entry.name).toLowerCase();
        const codeExtensions = [
          '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c',
          '.cs', '.go', '.rb', '.php', '.swift', '.kt', '.rs', '.vue',
          '.html', '.css', '.scss', '.sql', '.sh', '.yaml', '.yml', '.json',
          '.mjs', '.cjs', '.svelte', '.astro',
        ];

        if (codeExtensions.includes(ext)) {
          files.push({
            path: relativePath,
            fullPath: fullPath,
            name: entry.name,
            extension: ext,
          });
        }
      }
    }
  }

  await scanDirectory(repoPath);
  return files;
}

export async function readFileContent(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

export async function cleanupRepository(repoPath) {
  try {
    if (existsSync(repoPath)) {
      await fs.rm(repoPath, { recursive: true, force: true });
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}
