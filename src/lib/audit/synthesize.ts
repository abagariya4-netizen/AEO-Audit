import { GoogleGenerativeAI } from '@google/generative-ai';
import { ScoredCategory } from './types';

export async function synthesizeResults(categories: ScoredCategory[], overallScore: number, url: string): Promise<string> {
  let fallbackSummary = `The AEO Audit for ${url} resulted in an overall score of ${overallScore}/100. `;
  
  const fails = categories.flatMap(c => c.checks).filter(c => c.status === 'fail');
  if (fails.length > 0) {
    fallbackSummary += `Critical areas for improvement include: ${fails.slice(0, 3).map(f => f.title).join(', ')}. `;
  } else {
    fallbackSummary += `No critical failures were detected. `;
  }
  
  fallbackSummary += `Please review the detailed action plan below to address the warnings and manual verification items to maximize Answer Engine Visibility.`;

  if (!process.env.GEMINI_API_KEY) {
    return fallbackSummary;
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `
You are an expert AEO (Answer Engine Optimization) analyst.
I am providing you with the deterministic scoring results of a technical audit for ${url}.
The overall score is ${overallScore}/100.

Here is the data (JSON):
${JSON.stringify(categories.map(c => ({
  category: c.name,
  score: c.score,
  maxScore: c.maxScore,
  findings: c.checks.map(chk => ({
    title: chk.title,
    status: chk.status,
    impact: chk.impact,
    evidence: chk.evidence
  }))
})), null, 2)}

Write a concise, 2-paragraph executive summary of this report. 
RULES:
1. ONLY describe findings present in the provided JSON data.
2. DO NOT add facts, brands, statistics, or claims not in the input.
3. Keep it professional, objective, and actionable.
`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    return fallbackSummary;
  }
}
