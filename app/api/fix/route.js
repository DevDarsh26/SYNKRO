import { NextResponse } from 'next/server';
import { generateCodeFix } from '@/lib/gemini/client';

export async function POST(request) {
  try {
    const { issue, fullCode, mode, aiKey } = await request.json();

    if (!issue || !fullCode) {
      return NextResponse.json(
        { error: 'Issue and full code are required' },
        { status: 400 }
      );
    }

    if (!aiKey && !process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'AI API Key is not configured. Add it in Workspace Settings.' },
        { status: 500 }
      );
    }

    // Generate fix using Gemini or Grok
    let fixedCode;
    if (mode === 'full') {
      const { generateFullFileFix } = await import('@/lib/gemini/client');
      fixedCode = await generateFullFileFix(issue, fullCode, aiKey);
    } else {
      fixedCode = await generateCodeFix(issue, fullCode, aiKey);
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
