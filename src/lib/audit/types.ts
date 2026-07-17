export type AuditStatus = 'pass' | 'warn' | 'fail' | 'manual' | 'unavailable';
export type Impact = 'high' | 'med' | 'low';
export type Effort = 'high' | 'med' | 'low';
export type Category = 'Technical Access' | 'On-Page SEO' | 'Schema / Structured Data' | 'Content Structure' | 'Authority / Entity' | 'AI Visibility';

export interface PromptResult {
  prompt: string;
  stage: 'TOFU' | 'MOFU' | 'BOFU';
  responseText: string;
  brandMentioned: boolean;
  brandPosition: number | null;
  competitorsMentioned: string[];
  sourcesCount: number;
  failed: boolean;
}

export interface GeoIntelligenceSynthesis {
  executiveSummary: string;
  promptsYouWin: Array<{prompt: string, stage: string}>;
  promptsYouLose: Array<{prompt: string, stage: string, topCompetitor: string}>;
  brandDescriptors: string[];
  sprintPlan: Array<{
    sprint: number;
    timeframe: string;
    focus: string;
    actions: string[];
  }>;
}

export interface Evidence {
  technical: {
    robotsTxt: { status: number, content: string | null };
    llmsTxt: { status: number, content: string | null };
    sitemap: { status: number, content: string | null };
    https: boolean;
    rawHtml: string | null;
    viewportPresent: boolean;
    hreflangTags: string[];
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
    metaDescription: string | null;
    firstParagraph: string | null;
    imageAltCoverage: { total: number, withAlt: number };
    internalLinksCount: number;
    hasLists: boolean;
    canonicalUrl: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
  };
  authority: {
    wikipediaHit: any | null;
    wikidataHit: any | null;
    derivedBrandName: string;
  };
  aiVisibility: {
    isGrounded: boolean;
    promptResults: PromptResult[];
    competitors: string[];
    industry: string;
    promptsTested: string[];
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
  geoIntelligence?: GeoIntelligenceSynthesis;
  url: string;
}

export const CATEGORY_WEIGHTS: Record<Category, number> = {
  'Technical Access': 22,
  'Content Structure': 22,
  'Schema / Structured Data': 18,
  'Authority / Entity': 18,
  'AI Visibility': 20,
  'On-Page SEO': 0 
};
