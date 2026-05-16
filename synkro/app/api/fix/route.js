import { NextResponse } from 'next/server';
import { generateCodeFix } from '@/lib/gemini/client';

export async function POST(request) {
  try {
    const { issue, fullCode, mode } = await request.json();

    if (!issue || !fullCode) {
      return NextResponse.json(
        { error: 'Issue and full code are required' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API Key is not configured. Add GEMINI_API_KEY to your .env.local file.' },
        { status: 500 }
      );
    }

    // Generate fix using Gemini 2.5 Flash
    let fixedCode;
    if (mode === 'full') {
      const { generateFullFileFix } = await import('@/lib/gemini/client');
      fixedCode = await generateFullFileFix(issue, fullCode);
    } else {
      fixedCode = await generateCodeFix(issue, fullCode);
    }

    return NextResponse.json({
      success: true,
      fixedCode,
      issue: {
        title: issue.title,
        line: issue.line,
        file: issue.file,
      },
    });
  } catch (error) {
    console.error('Fix generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate fix' },
      { status: 500 }
    );
  }
}
