import { NextResponse } from 'next/server';
import { generateScanReport } from '@/lib/gemini/client';
import { createLogger } from '@/lib/logger';

const logger = createLogger('report');

export async function POST(request) {
  try {
    const { results, aiKey } = await request.json();

    if (!results || !Array.isArray(results)) {
      return NextResponse.json(
        { error: 'Valid scan results array is required' },
        { status: 400 }
      );
    }

    if (!aiKey && !process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'AI API Key is not configured. Add it in Workspace Settings.' },
        { status: 500 }
      );
    }

    // Generate report using Gemini or Grok
    const reportMarkdown = await generateScanReport(results, aiKey);

    return NextResponse.json({
      success: true,
      report: reportMarkdown,
    });
  } catch (error) {
    logger.error('Report generation error', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate report' },
      { status: 500 }
    );
  }
}
