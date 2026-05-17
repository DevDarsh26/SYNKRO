import { NextResponse } from 'next/server';
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit';
import { generateCodeFix, generateFullFileFix, generateScanReport } from '@/lib/gemini/client';
import { createLogger } from '@/lib/logger';

const logger = createLogger('fix');

/**
 * POST /api/fix
 * Rate-limited: 20 AI fix requests per minute per IP.
 */

export async function POST(request) {
  const rl = rateLimit(request, { limit: 20, windowMs: 60_000 });
  if (!rl.success) {
    return NextResponse.json(
      { error: 'AI rate limit reached. Please wait a moment before requesting another fix.' },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  try {
    const { issue, fullCode, customKey, mode, allIssues } = await request.json();

    if (!issue) {
      return NextResponse.json({ error: 'Issue is required' }, { status: 400 });
    }

    let fixedCode;
    if (mode === 'full') {
      fixedCode = await generateFullFileFix(issue, fullCode || '', customKey, allIssues);
    } else {
      fixedCode = await generateCodeFix(issue, fullCode || '', customKey, allIssues);
    }

    return NextResponse.json(
      { fixedCode },
      { headers: rateLimitHeaders(rl) }
    );
  } catch (error) {
    logger.error('Fix generation error', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate fix' },
      { status: 500 }
    );
  }
}
