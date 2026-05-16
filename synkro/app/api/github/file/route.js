import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const repoUrl = searchParams.get('repoUrl');
  const path = searchParams.get('path');
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!repoUrl || !path) {
    return NextResponse.json({ error: 'repoUrl and path are required' }, { status: 400 });
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

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch file from GitHub');
    }

    const data = await response.json();
    const content = Buffer.from(data.content, 'base64').toString('utf-8');

    return NextResponse.json({
      content,
      sha: data.sha,
      path: data.path
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { repoUrl, path, content, message, sha } = await request.json();
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'GitHub Token required to push code' }, { status: 401 });
    }

    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
    if (!match) return NextResponse.json({ error: 'Invalid repo URL' }, { status: 400 });

    const owner = match[1];
    const repo = match[2];

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${token}`,
        'User-Agent': 'Synkro-App'
      },
      body: JSON.stringify({
        message: message || `Fix security issue in ${path}`,
        content: Buffer.from(content).toString('base64'),
        sha: sha
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to push to GitHub');
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      commitUrl: data.commit.html_url
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
