import { GoogleGenAI } from '@google/genai';

let geminiClient = null;

export function getGeminiClient() {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

export async function generateCodeFix(issue, fullCode) {
  const client = getGeminiClient();
  if (!client) {
    throw new Error('Gemini API key is not configured');
  }

  const prompt = `You are an expert AI code fixing assistant. Please fix the following issue in the provided code.

Issue Title: ${issue.title}
Issue Description: ${issue.description}
Problematic Code snippet:
\`\`\`
${issue.code}
\`\`\`

Full File Context:
\`\`\`
${fullCode}
\`\`\`

Generate a fixed version of the specific problematic code. Return ONLY the fixed code snippet that should drop-in replace the problematic code. Do not include markdown formatting, explanations, or any other text.`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let fixedText = response.text.trim();
    if (fixedText.startsWith('```') && fixedText.endsWith('```')) {
        const lines = fixedText.split('\n');
        lines.shift();
        lines.pop();
        fixedText = lines.join('\n');
    }
    
    return fixedText;
  } catch (error) {
    console.error('Gemini fix generation error:', error);
    throw new Error(`Failed to generate fix: ${error.message}`);
  }
}

export async function generateFullFileFix(issue, fullCode) {
  const client = getGeminiClient();
  if (!client) {
    throw new Error('Gemini API key is not configured');
  }

  const prompt = `You are an expert AI code fixing assistant. Please fix the following issue in the provided full file.

Issue Title: ${issue.title}
Issue Description: ${issue.description}
Line Context (if any): ${issue.line || 'N/A'}

Original Full File Content:
\`\`\`
${fullCode}
\`\`\`

Return ONLY the completely fixed full file code. Do not include any explanations, markdown code fences, or surrounding text. It must be valid raw code that can directly replace the file.`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let fixedText = response.text.trim();
    if (fixedText.startsWith('```') && fixedText.endsWith('```')) {
        const lines = fixedText.split('\n');
        lines.shift();
        lines.pop();
        fixedText = lines.join('\n');
    }
    
    return fixedText;
  } catch (error) {
    console.error('Gemini full fix generation error:', error);
    throw new Error(`Failed to generate full file fix: ${error.message}`);
  }
}

export async function generateScanReport(results) {
  const client = getGeminiClient();
  if (!client) {
    throw new Error('Gemini API key is not configured');
  }

  // Summarize issues to fit in context window
  const summary = results.map(r => `- [${r.severity.toUpperCase()}] [${r.type}] in ${r.file}: ${r.title}`).join('\n');

  const prompt = `You are a Senior Security & Performance Engineer. Review the following code analysis findings from a repository scan and generate a professional, executive summary report.

Scan Findings:
${summary}

Write a professional report addressing:
1. Executive Summary (Overall health of the repository)
2. Critical Risks (Highlight the most dangerous issues)
3. Action Plan (Recommended steps for the development team)

Format the response using clean Markdown. Be concise, professional, and directly address the development team.`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error('Gemini report generation error:', error);
    throw new Error(`Failed to generate report: ${error.message}`);
  }
}
