import { EvaluationCheck, ScoredCategory, CATEGORY_WEIGHTS, Category } from './types';

export function calculateScore(checks: EvaluationCheck[]): { categories: ScoredCategory[], overallScore: number } {
  const categoryMap: Record<Category, EvaluationCheck[]> = {
    'Technical Access': [],
    'On-Page SEO': [],
    'Content Structure': [],
    'Schema / Structured Data': [],
    'Authority / Entity': [],
    'AI Visibility': []
  };

  checks.forEach(c => {
    if (categoryMap[c.category]) {
      categoryMap[c.category].push(c);
    }
  });

  const categories: ScoredCategory[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  for (const [catName, catChecks] of Object.entries(categoryMap)) {
    const category = catName as Category;
    const weight = CATEGORY_WEIGHTS[category];
    
    let earned = 0;
    let max = 0;

    for (const check of catChecks) {
      if (check.status === 'manual' || check.status === 'unavailable') {
        continue;
      }
      
      let checkPoints = 0;
      switch (check.impact) {
        case 'high': checkPoints = 3; break;
        case 'med': checkPoints = 2; break;
        case 'low': checkPoints = 1; break;
      }
      
      max += checkPoints;
      
      if (check.status === 'pass') {
        earned += checkPoints;
      } else if (check.status === 'warn') {
        earned += (checkPoints * 0.5);
      }
    }

    const percentage = max > 0 ? (earned / max) : 0;
    const categoryScore = max > 0 ? percentage * weight : 0;
    
    categories.push({
      name: category,
      score: categoryScore,
      maxScore: max > 0 ? weight : 0,
      weight,
      checks: catChecks
    });

    if (max > 0) {
      totalScore += categoryScore;
      totalWeight += weight;
    }
  }

  const overallScore = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;

  return { categories, overallScore: Math.round(overallScore) };
}
