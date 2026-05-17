import { GoogleGenAI } from '@google/genai';

/**
 * Universal AI Provider Routing
 * Detects the provider from the API key format:
 *  - AIza…         → Google Gemini
 *  - xai-…         → Grok (x.ai)
 *  - sk-ant-…      → Anthropic Claude
 *  - sk-…          → OpenAI
 *  - anything else → OpenAI-compatible (user must set SYNKRO_AI_BASE_URL)
 */

function detectProvider(key) {
  if (!key) return 'gemini'; // fallback to env GEMINI_API_KEY
  if (key.startsWith('xai-')) return 'grok';
  if (key.startsWith('sk-ant-')) return 'anthropic';
  if (key.startsWith('sk-')) return 'openai';
  // Gemini keys typically start with "AIza"
  if (key.startsWith('AIza') || key.length >= 30) return 'gemini';
  return 'openai'; // generic OpenAI-compatible fallback
}

const PROVIDER_CONFIG = {
  openai: { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o' },
  grok: { url: 'https://api.x.ai/v1/chat/completions', model: 'grok-3' },
  anthropic: { url: 'https://api.anthropic.com/v1/messages', model: 'claude-sonnet-4-20250514' },
};

async function callOpenAICompatible(apiKey, prompt, providerKey) {
  const config = PROVIDER_CONFIG[providerKey] || PROVIDER_CONFIG.openai;

  // Anthropic uses a different API shape
  if (providerKey === 'anthropic') {
    const res = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 8192,
        system: 'You are an elite Staff Security & Performance Engineer with deep expertise in static analysis, vulnerability assessment, and code remediation.',
        messages: [{ role: 'user', content: prompt }],
      })
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `Anthropic API error (${res.status})`); }
    const data = await res.json();
    return data.content?.[0]?.text || '';
  }

  // OpenAI / Grok / any OpenAI-compatible
  const res = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: 'You are an elite Staff Security & Performance Engineer with deep expertise in static analysis, vulnerability assessment, and code remediation.' },
        { role: 'user', content: prompt }
      ],
      model: config.model,
      temperature: 0.1
    })
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `${providerKey} API error (${res.status})`); }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callAI(prompt, customKey) {
  const provider = detectProvider(customKey);

  if (provider === 'gemini') {
    const key = customKey || process.env.GEMINI_API_KEY;
    if (!key) throw new Error('AI API key is not configured. Add it in Workspace Settings.');
    const client = new GoogleGenAI({ apiKey: key });
    const response = await client.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text;
  }

  return callOpenAICompatible(customKey, prompt, provider);
}

function stripCodeFences(text) {
  let t = text.trim();
  if (t.startsWith('```') && t.endsWith('```')) {
    const lines = t.split('\n');
    lines.shift();
    lines.pop();
    t = lines.join('\n');
  }
  return t;
}

export async function generateCodeFix(issue, fullCode, customKey, allIssues = []) {
  const otherIssuesContext = allIssues && allIssues.length > 0
    ? `\nOther known issues in the codebase (for cross-file context):\n${allIssues.slice(0, 50).map(i => `- ${i.file}: ${i.title}`).join('\n')}`
    : '';

  const prompt = `You are an elite AI code security and performance expert. Fix the following issue in the provided code.

Issue Title: ${issue.title}
Issue Description: ${issue.description}
Problematic Code snippet:
\`\`\`
${issue.code}
\`\`\`

Full File Context:
\`\`\`
${fullCode}
\`\`\`${otherIssuesContext}

CRITICAL INSTRUCTION: Generate a highly robust, secure, and production-ready fixed version of the specific problematic code snippet. 
Return ONLY the fixed code snippet that should drop-in replace the problematic code. Do not include markdown formatting, explanations, or any other text.`;

  try {
    const raw = await callAI(prompt, customKey);
    return stripCodeFences(raw);
  } catch (error) {
    console.error('Fix generation error:', error);
    throw new Error(`Failed to generate fix: ${error.message}`);
  }
}

export async function generateFullFileFix(issue, fullCode, customKey, allIssues = []) {
  const otherIssuesContext = allIssues && allIssues.length > 0
    ? `\nOther known issues in the codebase (for cross-file context):\n${allIssues.slice(0, 50).map(i => `- ${i.file}: ${i.title}`).join('\n')}`
    : '';

  const prompt = `You are an elite AI code fixing assistant. Please fix the following issue in the provided full file. Ensure no collateral damage.

Issue Title: ${issue.title}
Issue Description: ${issue.description}
Line Context: ${issue.line || 'N/A'}

Original Full File Content:
\`\`\`
${fullCode}
\`\`\`${otherIssuesContext}

CRITICAL INSTRUCTION: Return ONLY the completely fixed full file code. Do not include any explanations, markdown code fences, or surrounding text. It must be valid raw code that can directly replace the file.`;

  try {
    const raw = await callAI(prompt, customKey);
    return stripCodeFences(raw);
  } catch (error) {
    console.error('Full fix generation error:', error);
    throw new Error(`Failed to generate full file fix: ${error.message}`);
  }
}

export async function generateScanReport(results, customKey) {
  const summary = results.map(r => `- [${r.severity.toUpperCase()}] [${r.type}] in ${r.file}: ${r.title}`).join('\n');

  const prompt = `You are a Principal Security & Performance Auditor. Review the following code analysis findings from a repository scan and generate a comprehensive, executive-level security report.

Scan Findings:
${summary}

Write an extremely detailed, professional report addressing:
1. Executive Summary: Overall health of the repository, risk posture, and immediate concerns.
2. Threat Assessment: Detailed analysis of the critical risks and potential exploitation vectors.
3. Code Quality & Performance: Systemic architectural or pattern issues.
4. Actionable Remediation Plan: Step-by-step recommended actions for the development team, prioritized by severity.

Format the response using clean, advanced Markdown (use tables if necessary, clear headers, and professional formatting). Be highly technical, concise, and direct.`;

  try {
    return await callAI(prompt, customKey);
  } catch (error) {
    console.error('Report generation error:', error);
    throw new Error(`Failed to generate report: ${error.message}`);
  }
}

export async function generateAdditionalIssues(filesToScan, existingIssues, customKey) {
  const filePaths = filesToScan.map(f => f.path).slice(0, 50).join('\n');
  const existingSummary = existingIssues.slice(0, 30).map(r => `- ${r.type} in ${r.file}: ${r.title}`).join('\n');

  const prompt = `You are a Principal Security & Performance Auditor. We just ran a static analysis on a repository.
Here are up to 50 key file paths in the repo:
${filePaths}

Here are the top static issues already found:
${existingSummary}

Task: Infer MORE DEEPER, architectural vulnerabilities, logic flaws, or performance bottlenecks that are likely present in this specific stack based on the file names and the static issues found, BUT which a simple regex static analyzer would miss. DO NOT REPEAT ANY ISSUE ALREADY FOUND.

Return the result STRICTLY as a JSON array of objects. Do not include markdown formatting or backticks. Just the raw JSON array.
Each object must match this schema:
{
  "type": "security" | "performance" | "quality" | "dependency",
  "severity": "critical" | "high" | "medium" | "low",
  "title": "Short descriptive title",
  "description": "Detailed explanation of why this architectural issue exists",
  "line": null,
  "code": "/* Conceptual or structural flaw */",
  "fix": "Actionable fix summary",
  "recommendation": "Detailed recommendation",
  "file": "Choose one of the file paths provided that is most likely responsible"
}`;

  try {
    const raw = await callAI(prompt, customKey);
    let cleaned = raw.trim();
    if (cleaned.startsWith('\`\`\`')) {
      cleaned = cleaned.replace(/^\`\`\`(json)?/, '').replace(/\`\`\`$/, '').trim();
    }
    const issues = JSON.parse(cleaned);
    return Array.isArray(issues) ? issues : [];
  } catch (error) {
    console.warn('generateAdditionalIssues failed:', error.message);
    return [];
  }
}
