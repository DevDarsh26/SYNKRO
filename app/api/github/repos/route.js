import { NextResponse } from 'next/server';
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const logger = createLogger('repos');

/**
 * GET /api/github/repos
 * Fetches all repos (public + private) for the authenticated GitHub user.
 * Requires: Authorization: Bearer <github_oauth_token>
 * Optional query: ?type=all|public|private  &sort=updated|full_name  &per_page=100
 */
export async function GET(request) {
  const rl = rateLimit(request, { limit: 30, windowMs: 60_000 });
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  const token = request.headers.get('Authorization')?.replace('Bearer ', '').trim();
  if (!token) {
    return NextResponse.json({ error: 'GitHub token is required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';
  const sort = searchParams.get('sort') || 'updated';
  const perPage = Math.min(parseInt(searchParams.get('per_page') || '100', 10), 100);

  try {
    // Paginate up to 3 pages (300 repos max)
    let allRepos = [];
    for (let page = 1; page <= 3; page++) {
      const res = await fetch(
        `https://api.github.com/user/repos?type=${type}&sort=${sort}&per_page=${perPage}&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          next: { revalidate: 60 }, // cache for 60s in Next.js
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `GitHub API error (${res.status})`);
      }

      const repos = await res.json();
      allRepos = allRepos.concat(repos);

      // Stop early if fewer than perPage returned (last page)
      if (repos.length < perPage) break;
    }

    // Shape the response to only what the UI needs
    const shaped = allRepos.map((r) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      html_url: r.html_url,
      description: r.description,
      private: r.private,
      language: r.language,
      stargazers_count: r.stargazers_count,
      updated_at: r.updated_at,
      default_branch: r.default_branch,
    }));

    return NextResponse.json({ repos: shaped, total: shaped.length }, { headers: rateLimitHeaders(rl) });
  } catch (error) {
    logger.error('GitHub repos fetch error', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch repositories' }, { status: 500 });
  }
}
