import * as cheerio from 'cheerio';
import { Evidence } from './types';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';

async function fetchSafe(url: string): Promise<{ status: number, content: string | null }> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1'
      }
    });
    if (!res.ok) {
      return { status: res.status, content: null };
    }
    const text = await res.text();
    return { status: res.status, content: text };
  } catch (e) {
    return { status: 0, content: null };
  }
}

function extractJsonLd($: cheerio.CheerioAPI): any[] {
  const scripts = $('script[type="application/ld+json"]');
  const results: any[] = [];
  scripts.each((_, el) => {
    try {
      let content = $(el).html() || '{}';
      content = content.trim().replace(/;+$/, '');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        results.push(...parsed);
      } else {
        results.push(parsed);
      }
    } catch (e) { }
  });
  return results;
}

function deriveBrandName(evidence: Partial<Evidence>): string {
  const schemaOrg = evidence.schema?.jsonLd.find((s: any) => s['@type'] === 'Organization' || s['@type'] === 'WebSite' || s['@type'] === 'LocalBusiness');
  if (schemaOrg?.name) return schemaOrg.name;

  if (evidence.content?.ogSiteName) return evidence.content.ogSiteName;

  if (evidence.content?.title) {
    const titleParts = evidence.content.title.split(/[-|]/);
    return titleParts[0].trim();
  }

  try {
    const urlObj = new URL(evidence.url!);
    return urlObj.hostname.replace('www.', '').split('.')[0];
  } catch (e) {
    return 'Unknown Brand';
  }
}

export async function collectEvidence(urlStr: string, onProgress?: (msg: string) => void): Promise<Evidence> {
  const evidence: Partial<Evidence> = {
    url: urlStr,
    technical: {} as any,
    schema: { jsonLd: [], microdata: [], rdfa: [] },
    content: {
      title: null, h1: [], h2: [], h3: [], hasFaqIdOrClass: false,
      statistics: [], quotes: [], publishedTime: null, author: null, ogSiteName: null
    },
    authority: { wikipediaHit: null, wikidataHit: null, derivedBrandName: '' },
    aiVisibility: { groundedResult: null, groundedSources: null, promptsTested: [], isGrounded: false }
  };

  try {
    const url = new URL(urlStr);
    const baseUrl = `${url.protocol}//${url.hostname}`;

    onProgress?.('Fetching homepage...');
    const homeRes = await fetchSafe(urlStr);
    evidence.technical!.https = url.protocol === 'https:';
    evidence.technical!.rawHtml = homeRes.content;

    if (homeRes.content) {
      const $ = cheerio.load(homeRes.content);

      evidence.schema!.jsonLd = extractJsonLd($);
      // Microdata and RDFa are omitted for brevity, focusing on high-value JSON-LD

      evidence.content!.title = $('title').text() || null;
      evidence.content!.ogSiteName = $('meta[property="og:site_name"]').attr('content') || null;
      evidence.content!.h1 = $('h1').map((_, el) => $(el).text().trim()).get();
      evidence.content!.h2 = $('h2').map((_, el) => $(el).text().trim()).get();
      evidence.content!.h3 = $('h3').map((_, el) => $(el).text().trim()).get();

      const htmlText = $('body').text().toLowerCase();
      evidence.content!.hasFaqIdOrClass = htmlText.includes('faq') || htmlText.includes('frequently asked questions');

      evidence.content!.publishedTime = $('meta[property="article:published_time"]').attr('content') || $('time').attr('datetime') || null;
      evidence.content!.author = $('meta[name="author"]').attr('content') || $('meta[property="article:author"]').attr('content') || null;

      // Look for statistics (simple regex: % or $)
      const textNodes = $('p, li, span').map((_, el) => $(el).text()).get().join(' ');
      const statsMatches = textNodes.match(/\b\d+(\.\d+)?%|\$\d+(,\d+)*(\.\d+)?/g) || [];
      evidence.content!.statistics = Array.from(new Set(statsMatches)).slice(0, 5);

      const quotesMatches = textNodes.match(/"([^"]+)"|“([^”]+)”/g) || [];
      evidence.content!.quotes = quotesMatches.slice(0, 3);
    }

    onProgress?.('Fetching technical endpoints...');
    evidence.technical!.robotsTxt = await fetchSafe(`${baseUrl}/robots.txt`);
    evidence.technical!.llmsTxt = await fetchSafe(`${baseUrl}/llms.txt`);
    evidence.technical!.sitemap = await fetchSafe(`${baseUrl}/sitemap.xml`);

    onProgress?.('Querying entity APIs...');
    const brandName = deriveBrandName(evidence);
    evidence.authority!.derivedBrandName = brandName;

    if (brandName && brandName !== 'Unknown Brand') {
      const brandLower = brandName.toLowerCase();

      // Wikipedia: only accept the hit when the article title contains the full brand name
      try {
        const wikiRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(brandName)}&utf8=&format=json`);
        const wikiData = await wikiRes.json();
        const hits: any[] = wikiData.query?.search || [];
        const matchedHit = hits.find((h: any) => h.title.toLowerCase().includes(brandLower));
        if (matchedHit) {
          evidence.authority!.wikipediaHit = matchedHit;
        }
      } catch (e) { }

      // Wikidata: fetch P856 (official website); also try sitelinks for a Wikipedia backlink
      try {
        const wikiDataRes = await fetch(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(brandName)}&language=en&format=json`);
        const wikiDataJson = await wikiDataRes.json();
        // Only accept the Wikidata hit if its label contains the full brand name
        const wdHits: any[] = wikiDataJson.search || [];
        const matchedWdHit = wdHits.find((h: any) => (h.label || '').toLowerCase().includes(brandLower));
        if (matchedWdHit) {
          evidence.authority!.wikidataHit = matchedWdHit;
          const entityId = matchedWdHit.id;
          const entityRes = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityId}&props=claims|sitelinks&format=json`);
          const entityJson = await entityRes.json();
          const claims = entityJson.entities[entityId]?.claims;
          // P856 = official website
          if (claims?.P856) {
            evidence.authority!.wikidataHit.officialWebsites = claims.P856.map((c: any) => c.mainsnak.datavalue.value);
          }
          // Fallback: if P856 missing but enwiki sitelink exists, record the Wikipedia title
          if (!claims?.P856 && entityJson.entities[entityId]?.sitelinks?.enwiki) {
            evidence.authority!.wikidataHit.wikiTitle = entityJson.entities[entityId].sitelinks.enwiki.title;
          }
        }
      } catch (e) { }
    }

    onProgress?.('Testing AI Visibility...');
    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = `What are the best mattress brands in India? List specific brand names.`;
        evidence.aiVisibility!.promptsTested = [prompt];

        const apiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              tools: [{ google_search: {} }]
            })
          }
        );

        const data = await apiRes.json();

        if (!apiRes.ok) {
          throw new Error(`API ${apiRes.status}: ${JSON.stringify(data).slice(0, 300)}`);
        }

        const answerText = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join(' ') || '';
        evidence.aiVisibility!.groundedResult = answerText;
        evidence.aiVisibility!.isGrounded = true;

        const chunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks;
        evidence.aiVisibility!.groundedSources = chunks || [];
      } catch (e: any) {
        evidence.aiVisibility!.groundedResult = `Failed: ${e.message}`;
        evidence.aiVisibility!.isGrounded = false;
      }
    } else {
      evidence.aiVisibility!.groundedResult = null;
      evidence.aiVisibility!.isGrounded = false;
    }

    return evidence as Evidence;
  } catch (e: any) {
    throw new Error(`Failed to collect evidence: ${e.message}`);
  }
}