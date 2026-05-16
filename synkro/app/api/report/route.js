import { NextResponse } from 'next/server';
import { generateScanReport } from '@/lib/gemini/client';

export async function POST(request) {
  try {
    const { results } = await request.json();

    if (!results || !Array.isArray(results)) {
      return NextResponse.json(
        { error: 'Valid scan results array is required' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API Key is not configured. Add GEMINI_API_KEY to your .env.local file.' },
        { status: 500 }
      );
    }

    // Generate report using Gemini 2.5 Flash
    const reportMarkdown = await generateScanReport(results);

    return NextResponse.json({
      success: true,
      report: reportMarkdown,
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate report' },
      { status: 500 }
    );
  }
}
