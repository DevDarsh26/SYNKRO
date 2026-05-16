import { WatsonXAI } from '@ibm-cloud/watsonx-ai';

let watsonxClient = null;

export function getWatsonxClient() {
  if (!watsonxClient) {
    watsonxClient = WatsonXAI.newInstance({
      version: '2024-05-31',
      serviceUrl: process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com',
    });
  }
  return watsonxClient;
}

export async function analyzeCodeWithWatsonx(code, fileName, analysisType = 'comprehensive') {
  const client = getWatsonxClient();
  
  const prompt = `You are a code security and quality analyzer. Analyze the following code file and identify issues.

File: ${fileName}
Code:
\`\`\`
${code}
\`\`\`

Analyze for:
1. Security vulnerabilities (SQL injection, XSS, hardcoded secrets, insecure dependencies)
2. Code quality issues (unused imports, dead code, complex functions, code smells)
3. Performance problems (N+1 queries, memory leaks, inefficient algorithms)
4. Testing gaps (missing tests, untested code paths)
5. Best practices violations

Return a JSON array of issues with this exact structure:
[
  {
    "type": "security|quality|performance|testing|dependency",
    "severity": "critical|high|medium|low",
    "title": "Brief issue title",
    "description": "Detailed description",
    "line": line_number,
    "code": "problematic code snippet",
    "fix": "Suggested fix or code replacement",
    "recommendation": "How to prevent this in future"
  }
]

Return ONLY valid JSON, no additional text.`;

  try {
    const response = await client.generateText({
      input: prompt,
      modelId: 'ibm/granite-13b-chat-v2',
      projectId: process.env.WATSONX_PROJECT_ID,
      parameters: {
        max_new_tokens: 2000,
        temperature: 0.3,
        top_p: 0.9,
      },
    });

    const result = response.result.generated_text;
    
    // Try to parse JSON from response
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return [];
  } catch (error) {
    console.error('Watsonx analysis error:', error);
    throw new Error(`Failed to analyze code: ${error.message}`);
  }
}

export async function generateCodeFix(issue, fullCode) {
  const client = getWatsonxClient();
  
  const prompt = `You are a code fixing assistant. Generate a fix for the following issue:

Issue: ${issue.title}
Description: ${issue.description}
Problematic code at line ${issue.line}:
\`\`\`
${issue.code}
\`\`\`

Full context:
\`\`\`
${fullCode}
\`\`\`

Generate a fixed version of the code. Return ONLY the fixed code snippet that should replace the problematic code, nothing else.`;

  try {
    const response = await client.generateText({
      input: prompt,
      modelId: 'ibm/granite-13b-chat-v2',
      projectId: process.env.WATSONX_PROJECT_ID,
      parameters: {
        max_new_tokens: 500,
        temperature: 0.2,
        top_p: 0.9,
      },
    });

    return response.result.generated_text.trim();
  } catch (error) {
    console.error('Watsonx fix generation error:', error);
    throw new Error(`Failed to generate fix: ${error.message}`);
  }
}

// Made with Bob
