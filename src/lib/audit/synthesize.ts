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

export async function synthesizeGeoIntelligence(evidence: import('./types').Evidence): Promise<import('./types').GeoIntelligenceSynthesis | null> {
  if (!process.env.GEMINI_API_KEY || !evidence.aiVisibility.isGrounded || evidence.aiVisibility.promptResults.length === 0) {
    return null;
  }

  const results = evidence.aiVisibility.promptResults.filter(r => !r.failed);
  if (results.length === 0) return null;

  const total = results.length;
  const brandMentions = results.filter(r => r.brandMentioned).length;
  const citationRate = ((brandMentions / total) * 100).toFixed(0);
  
  const stages = ['TOFU', 'MOFU', 'BOFU'];
  const stageRates: Record<string, string> = {};
  stages.forEach(stage => {
    const stagePrompts = results.filter(r => r.stage === stage);
    if (stagePrompts.length > 0) {
      stageRates[stage] = ((stagePrompts.filter(r => r.brandMentioned).length / stagePrompts.length) * 100).toFixed(0);
    } else {
      stageRates[stage] = '0';
    }
  });

  const winningPrompts = results.filter(r => r.brandMentioned).map(r => ({ prompt: r.prompt, stage: r.stage }));
  const losingPrompts = results.filter(r => !r.brandMentioned).map(r => {
    // find top competitor for this prompt if any
    let topCompetitor = 'None';
    if (r.competitorsMentioned.length > 0) {
      topCompetitor = r.competitorsMentioned[0];
    }
    return { prompt: r.prompt, stage: r.stage, topCompetitor };
  });

  const competitorData = evidence.aiVisibility.competitors.map(c => {
    const count = results.filter(r => r.competitorsMentioned.includes(c)).length;
    return `${c}: ${count} mentions`;
  });

  const sampleTexts = results.filter(r => r.brandMentioned).slice(0, 3).map(r => r.responseText.substring(0, 150) + '...').join('\n');

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are an AEO/SEO analyst. I am providing you with REAL data from live AI engine tests. 
Analyze ONLY the data provided. Do not add facts, brand names, statistics, or competitors 
not present in the input data.

Data provided:
- Industry: ${evidence.aiVisibility.industry}
- Brand tested: ${evidence.authority.derivedBrandName}
- Total prompts tested: ${total}
- Citation rate: ${citationRate}%
- Funnel breakdown: TOFU ${stageRates['TOFU']}%, MOFU ${stageRates['MOFU']}%, BOFU ${stageRates['BOFU']}%
- Prompts where brand appeared: ${JSON.stringify(winningPrompts)}
- Prompts where brand was absent: ${JSON.stringify(losingPrompts)}
- Competitors mentioned in responses: ${JSON.stringify(competitorData)}
- Sample response texts where brand appeared: ${sampleTexts}

Generate the analysis JSON exactly matching this format. Sprint actions must directly address the specific funnel gaps identified in the data — do not give generic SEO advice. Do not include markdown code block syntax (like \`\`\`json). Return raw JSON:
{
  "executiveSummary": "2-3 sentences: state current visibility, biggest strength, biggest gap.",
  "brandDescriptors": ["word1", "phrase2", "word3"],
  "sprintPlan": [
    { "sprint": 1, "timeframe": "Days 1-30", "focus": "string", "actions": ["action 1", "action 2"] },
    { "sprint": 2, "timeframe": "Days 31-60", "focus": "string", "actions": ["action 1", "action 2"] },
    { "sprint": 3, "timeframe": "Days 61-90", "focus": "string", "actions": ["action 1", "action 2"] }
  ]
}`;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(text);

    return {
      executiveSummary: data.executiveSummary,
      brandDescriptors: data.brandDescriptors || [],
      sprintPlan: data.sprintPlan || [],
      promptsYouWin: winningPrompts,
      promptsYouLose: losingPrompts
    };
  } catch (e) {
    return null;
  }
}
