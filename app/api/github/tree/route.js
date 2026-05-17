import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const repoUrl = searchParams.get('repoUrl');
  let branch = searchParams.get('branch') || 'main';
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!repoUrl) {
    return NextResponse.json({ error: 'repoUrl is required' }, { status: 400 });
  }

  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
  if (!match) return NextResponse.json({ error: 'Invalid repo URL' }, { status: 400 });

  const owner = match[1];
  const repo = match[2];

  try {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Synkro-App'
    };
    
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    // Fetch repo info to get default branch
    const repoInfoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!repoInfoRes.ok) {
      throw new Error('Failed to fetch repository information');
    }
    const repoInfo = await repoInfoRes.json();
    const defaultBranch = repoInfo.default_branch;

    // Fetch the tree
    const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`, { headers });

    if (!treeResponse.ok) {
      const errorData = await treeResponse.json();
      throw new Error(errorData.message || 'Failed to fetch repository tree');
    }

    const data = await treeResponse.json();
    return NextResponse.json({ tree: data.tree, branch: defaultBranch });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
