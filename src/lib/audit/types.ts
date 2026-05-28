export type AuditStatus = 'pass' | 'warn' | 'fail' | 'manual' | 'unavailable';
export type Impact = 'high' | 'med' | 'low';
export type Effort = 'high' | 'med' | 'low';
export type Category = 'Technical Access' | 'Schema / Structured Data' | 'Content Structure' | 'Authority / Entity' | 'AI Visibility';

export interface Evidence {
  technical: {
    robotsTxt: { status: number, content: string | null };
    llmsTxt: { status: number, content: string | null };
    sitemap: { status: number, content: string | null };
    https: boolean;
    rawHtml: string | null;
  };
  schema: {
    jsonLd: any[];
    microdata: any[];
    rdfa: any[];
  };
  content: {
    title: string | null;
    h1: string[];
    h2: string[];
    h3: string[];
    hasFaqIdOrClass: boolean;
    statistics: string[];
    quotes: string[];
    publishedTime: string | null;
    author: string | null;
    ogSiteName: string | null;
  };
  authority: {
    wikipediaHit: any | null;
    wikidataHit: any | null;
    derivedBrandName: string;
  };
  aiVisibility: {
    groundedResult: any | null;
    groundedSources: any[] | null;
    promptsTested: string[];
    isGrounded: boolean;
  };
  url: string;
}

export interface EvaluationCheck {
  id: string;
  category: Category;
  status: AuditStatus;
  impact: Impact;
  effort: Effort;
  evidence: string;
  recommendation: string;
  title: string;
}

export interface ScoredCategory {
  name: Category;
  score: number;
  maxScore: number;
  weight: number;
  checks: EvaluationCheck[];
}

export interface AuditResult {
  overallScore: number;
  categories: ScoredCategory[];
  executiveSummary: string;
  url: string;
}

export const CATEGORY_WEIGHTS: Record<Category, number> = {
  'Technical Access': 25,
  'Content Structure': 25,
  'Schema / Structured Data': 20,
  'Authority / Entity': 20,
  'AI Visibility': 10
};
