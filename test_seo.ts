import { collectEvidence } from './src/lib/audit/collect';
import { evaluateEvidence } from './src/lib/audit/evaluate';
import { CATEGORY_WEIGHTS } from './src/lib/audit/types';

async function runAudit(url: string) {
  console.log(`\n--- Auditing ${url} ---`);
  const evidence = await collectEvidence(url);
  const checks = evaluateEvidence(evidence);
  
  // Group by category and calculate score
  const categories = Object.keys(CATEGORY_WEIGHTS).map(catName => {
    const catChecks = checks.filter(c => c.category === catName);
    const weight = CATEGORY_WEIGHTS[catName as keyof typeof CATEGORY_WEIGHTS];
    
    const scorableChecks = catChecks.filter(c => c.status !== 'manual' && c.status !== 'unavailable');
    const maxScore = scorableChecks.reduce((sum, c) => sum + (c.impact === 'high' ? 3 : c.impact === 'med' ? 2 : 1), 0);
    
    let score = 0;
    scorableChecks.forEach(c => {
      const impactMultiplier = c.impact === 'high' ? 3 : c.impact === 'med' ? 2 : 1;
      if (c.status === 'pass') score += impactMultiplier;
      else if (c.status === 'warn') score += impactMultiplier * 0.5;
    });
    
    return { name: catName, score: maxScore > 0 ? (score / maxScore) * 100 : 0, maxScore: 100, weight, checks: catChecks };
  });

  // Calculate total score
  const scorableCategories = categories.filter(c => c.checks.some(ch => ch.status !== 'manual' && ch.status !== 'unavailable'));
  const totalWeight = scorableCategories.reduce((acc, c) => acc + c.weight, 0);
  
  let overallScore = 0;
  if (totalWeight > 0) {
    const weightedSum = scorableCategories.reduce((acc, c) => acc + (c.score * (c.weight / totalWeight)), 0);
    overallScore = Math.round(weightedSum);
  }

  console.log(`Overall Score: ${overallScore}/100`);
  categories.forEach(c => {
    console.log(`- ${c.name}: ${Math.round(c.score)}/100`);
  });

  console.log(`\nSample On-Page SEO Evidence:`);
  const onPage = categories.find(c => c.name === 'On-Page SEO');
  onPage?.checks.slice(0, 3).forEach(c => {
    console.log(`[${c.status}] ${c.title}: ${c.evidence}`);
  });
}

async function main() {
  await runAudit('https://thesleepcompany.in');
  await runAudit('https://apple.com');
  await runAudit('https://microsoft.com');
}

main().catch(console.error);
