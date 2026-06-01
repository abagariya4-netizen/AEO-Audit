import { Evidence, EvaluationCheck } from './types';

export function evaluateEvidence(evidence: Evidence): EvaluationCheck[] {
  const checks: EvaluationCheck[] = [];

  // 1. Technical Access
  const robotsLines = evidence.technical.robotsTxt?.content?.split('\n') || [];
  const blockedBots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Perplexity-User', 'ClaudeBot', 'Claude-Web', 'Google-Extended', 'CCBot', 'Amazonbot', 'Bytespider'].filter(bot =>
    robotsLines.some(line => line.toLowerCase().includes(bot.toLowerCase()) && line.toLowerCase().includes('disallow'))
  );

  if (blockedBots.length > 0) {
    checks.push({
      id: 'robots-txt-bots',
      category: 'Technical Access',
      status: 'fail',
      impact: 'high',
      effort: 'low',
      evidence: `robots.txt contains disallow rules for: ${blockedBots.join(', ')}`,
      recommendation: `Remove the Disallow rules for ${blockedBots.join(', ')} in your robots.txt to allow AI answer engines to crawl your content.`,
      title: 'AI Crawler Access'
    });
  } else {
    checks.push({
      id: 'robots-txt-bots',
      category: 'Technical Access',
      status: 'pass',
      impact: 'high',
      effort: 'low',
      evidence: `robots.txt (${robotsLines.length} lines) does not block major AI crawlers.`,
      recommendation: `Since robots.txt (${robotsLines.length} lines) does not block major AI crawlers, maintain this open access.`,
      title: 'AI Crawler Access'
    });
  }

  // llms.txt
  if (evidence.technical.llmsTxt?.status === 200) {
    checks.push({
      id: 'llms-txt',
      category: 'Technical Access',
      status: 'pass',
      impact: 'med',
      effort: 'low',
      evidence: `/llms.txt found (${evidence.technical.llmsTxt.content?.length} bytes)`,
      recommendation: `Since a valid /llms.txt was found (${evidence.technical.llmsTxt.content?.length} bytes), maintain it to guide AI models.`,
      title: 'llms.txt Presence'
    });
  } else {
    checks.push({
      id: 'llms-txt',
      category: 'Technical Access',
      status: 'warn',
      impact: 'low',
      effort: 'low',
      evidence: `No /llms.txt found (HTTP ${evidence.technical.llmsTxt?.status})`,
      recommendation: `Since /llms.txt returned HTTP ${evidence.technical.llmsTxt?.status}, add an /llms.txt file at the root to explicitly summarize your site's structure for AI crawlers.`,
      title: 'llms.txt Presence'
    });
  }

  // JS Rendering check (Empty Shell)
  const rawHtml = evidence.technical.rawHtml || '';
  const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyText = bodyMatch ? bodyMatch[1].replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, '').trim() : '';

  if (bodyText.length < 200 && rawHtml.includes('<script')) {
    checks.push({
      id: 'js-rendering-shell',
      category: 'Technical Access',
      status: 'fail',
      impact: 'high',
      effort: 'high',
      evidence: `Raw HTML body contains only ${bodyText.length} characters of visible text. Indicates a JS shell.`,
      recommendation: `Because the raw HTML payload contains only ${bodyText.length} characters of text within a <script>-heavy shell, implement Server-Side Rendering (SSR) or dynamic rendering for AI bots.`,
      title: 'JS-Rendering Shell Detection'
    });
  } else {
    checks.push({
      id: 'js-rendering-shell',
      category: 'Technical Access',
      status: 'pass',
      impact: 'high',
      effort: 'med',
      evidence: `Raw HTML body contains ${bodyText.length} characters of visible text. Primary content is present in the server response.`,
      recommendation: `Since the raw HTML contains ${bodyText.length} characters of visible text, continue serving primary content directly.`,
      title: 'JS-Rendering Shell Detection'
    });
  }

  if (evidence.technical.viewportPresent) {
    checks.push({
      id: 'tech-viewport', category: 'Technical Access', status: 'pass', impact: 'high', effort: 'low',
      evidence: 'viewport meta tag present',
      recommendation: 'Since viewport meta tag is present, mobile rendering basics are supported.', title: 'Viewport Meta Tag'
    });
  } else {
    checks.push({
      id: 'tech-viewport', category: 'Technical Access', status: 'fail', impact: 'high', effort: 'low',
      evidence: 'viewport meta tag absent',
      recommendation: 'Because the viewport meta tag is absent, add <meta name="viewport" content="width=device-width, initial-scale=1">.', title: 'Viewport Meta Tag'
    });
  }

  if (evidence.technical.hreflangTags && evidence.technical.hreflangTags.length > 0) {
    checks.push({
      id: 'tech-hreflang', category: 'Technical Access', status: 'pass', impact: 'low', effort: 'med',
      evidence: `Found ${evidence.technical.hreflangTags.length} hreflang tags (e.g. ${evidence.technical.hreflangTags.slice(0, 3).join(', ')}).`,
      recommendation: `Maintain existing hreflang tags for multi-region targeting.`, title: 'Hreflang Tags'
    });
  } else {
    checks.push({
      id: 'tech-hreflang', category: 'Technical Access', status: 'manual', impact: 'low', effort: 'med',
      evidence: `0 hreflang tags found.`,
      recommendation: `Verify if this site serves multiple regions. If so, implement hreflang tags.`, title: 'Hreflang Tags'
    });
  }

  // 2. Schema / Structured Data
  const schemaTypes = evidence.schema.jsonLd.map(s => s['@type']);
  const highValueTypes = ['Organization', 'Product', 'FAQPage', 'Article', 'HowTo', 'BreadcrumbList', 'Review', 'WebSite', 'LocalBusiness'];
  const foundHighValue = schemaTypes.filter(t => highValueTypes.includes(t));

  if (foundHighValue.length > 0) {
    checks.push({
      id: 'schema-high-value',
      category: 'Schema / Structured Data',
      status: 'pass',
      impact: 'high',
      effort: 'med',
      evidence: `Found ${foundHighValue.length} high-value schema types: ${foundHighValue.join(', ')}.`,
      recommendation: `Since high-value schemas (${foundHighValue.join(', ')}) were found, ensure their properties remain fully populated.`,
      title: 'Structured Data Presence'
    });
  } else {
    checks.push({
      id: 'schema-high-value',
      category: 'Schema / Structured Data',
      status: 'fail',
      impact: 'high',
      effort: 'med',
      evidence: `No high-value schema types found (Organization, Product, FAQPage, etc.). Found: ${schemaTypes.length > 0 ? schemaTypes.join(', ') : 'None'}.`,
      recommendation: `Because only [${schemaTypes.length > 0 ? schemaTypes.join(', ') : 'None'}] schemas were found, implement high-value JSON-LD schema (e.g., Organization, FAQPage) to explicitly declare entities to answer engines.`,
      title: 'Structured Data Presence'
    });
  }

  // 3. Content Structure
  const questionH2s = evidence.content.h2.filter(h => h.includes('?'));
  if (questionH2s.length > 0) {
    checks.push({
      id: 'content-question-headings',
      category: 'Content Structure',
      status: 'pass',
      impact: 'med',
      effort: 'low',
      evidence: `Found ${questionH2s.length} H2s phrased as questions (e.g., "${questionH2s[0]}").`,
      recommendation: `Since ${questionH2s.length} H2s are phrased as questions, continue using question-form headings.`,
      title: 'Question-Form Headings'
    });
  } else {
    checks.push({
      id: 'content-question-headings',
      category: 'Content Structure',
      status: 'warn',
      impact: 'med',
      effort: 'low',
      evidence: `No H2 headings contain question marks. Found: ${evidence.content.h2.slice(0, 2).join(', ')}...`,
      recommendation: `Because none of the discovered H2 headings (${evidence.content.h2.slice(0, 2).join(', ')}...) contain question marks, rephrase some into direct questions to match natural language queries.`,
      title: 'Question-Form Headings'
    });
  }

  // Statistics
  if (evidence.content.statistics.length > 0) {
    checks.push({
      id: 'content-statistics',
      category: 'Content Structure',
      status: 'pass',
      impact: 'low',
      effort: 'low',
      evidence: `Found ${evidence.content.statistics.length} statistics/data points (e.g., ${evidence.content.statistics.join(', ')}).`,
      recommendation: `Since ${evidence.content.statistics.length} statistics were found (e.g. ${evidence.content.statistics[0]}), keep citing concrete data.`,
      title: 'Named Statistics'
    });
  } else {
    checks.push({
      id: 'content-statistics',
      category: 'Content Structure',
      status: 'warn',
      impact: 'low',
      effort: 'med',
      evidence: `No distinct statistical figures (%, $) detected in the main text.`,
      recommendation: `Because no distinct statistical figures (%, $) were detected in the main text, include specific named statistics to increase the likelihood of AI citation.`,
      title: 'Named Statistics'
    });
  }

  // 4. Authority / Entity
  // Wikipedia
  let confidentMatch = false;
  if (evidence.authority.wikidataHit?.officialWebsites?.length > 0) {
    try {
      const auditHost = new URL(evidence.url).hostname.replace('www.', '');
      confidentMatch = evidence.authority.wikidataHit.officialWebsites.some((siteUrl: string) => {
        try {
          return new URL(siteUrl).hostname.replace('www.', '') === auditHost;
        } catch (e) { return false; }
      });
    } catch (e) { }
  }

  if (evidence.authority.wikipediaHit && confidentMatch) {
    checks.push({
      id: 'authority-wikipedia',
      category: 'Authority / Entity',
      status: 'pass',
      impact: 'high',
      effort: 'high',
      evidence: `Found entity "${evidence.authority.wikipediaHit.title}" with verified backlink to ${evidence.url}.`,
      recommendation: `Since the verified entity "${evidence.authority.wikipediaHit.title}" correctly links back to your site, maintain this Knowledge Graph presence.`,
      title: 'Verified Entity'
    });
  } else if (evidence.authority.wikipediaHit || evidence.authority.wikidataHit) {
    const entityName = evidence.authority.wikipediaHit?.title
      || evidence.authority.wikidataHit?.wikiTitle
      || evidence.authority.wikidataHit?.label
      || evidence.authority.derivedBrandName;
    checks.push({
      id: 'authority-wikipedia',
      category: 'Authority / Entity',
      status: 'manual',
      impact: 'high',
      effort: 'high',
      evidence: `Found entity for "${entityName}", but official website URL was not confidently verified.`,
      recommendation: `Verify if the entity page for "${entityName}" correctly links back to ${evidence.url} as its official website.`,
      title: 'Unverified Entity (Low Confidence)'
    });
  } else {
    checks.push({
      id: 'authority-wikipedia',
      category: 'Authority / Entity',
      status: 'manual',
      impact: 'high',
      effort: 'high',
      evidence: `No confident search hit found for derived brand "${evidence.authority.derivedBrandName}".`,
      recommendation: `Search manually to verify if a Wikipedia or Wikidata entity exists for "${evidence.authority.derivedBrandName}" and links back to ${evidence.url}.`,
      title: 'Wikipedia Entity (Low Confidence)'
    });
  }

  // 5. AI Visibility
  if (!evidence.aiVisibility.isGrounded) {
    checks.push({
      id: 'ai-visibility-grounded',
      category: 'AI Visibility',
      status: 'unavailable',
      impact: 'med',
      effort: 'high',
      evidence: `API Key missing or grounding failed: ${evidence.aiVisibility.groundedResult}`,
      recommendation: `Provide a Gemini API key with Google Search grounding enabled to measure live visibility.`,
      title: 'Live AI Visibility (Grounded)'
    });
  } else {
    const isBrandMentioned = evidence.aiVisibility.groundedResult?.toLowerCase().includes(evidence.authority.derivedBrandName.toLowerCase());
    if (isBrandMentioned) {
      checks.push({
        id: 'ai-visibility-grounded',
        category: 'AI Visibility',
        status: 'pass',
        impact: 'high',
        effort: 'high',
        evidence: `Brand "${evidence.authority.derivedBrandName}" was mentioned in grounded response. Sources cited: ${evidence.aiVisibility.groundedSources?.length || 0}.`,
        recommendation: `Since "${evidence.authority.derivedBrandName}" appeared in the grounded response with ${evidence.aiVisibility.groundedSources?.length || 0} sources cited, monitor competitive queries next.`,
        title: 'Live AI Visibility (Grounded)'
      });
    } else {
      checks.push({
        id: 'ai-visibility-grounded',
        category: 'AI Visibility',
        status: 'fail',
        impact: 'high',
        effort: 'high',
        evidence: `Brand "${evidence.authority.derivedBrandName}" was NOT mentioned in the grounded response. Tested prompt: "${evidence.aiVisibility.promptsTested[0]}"`,
        recommendation: `Because "${evidence.authority.derivedBrandName}" was NOT mentioned in the grounded response for the prompt "${evidence.aiVisibility.promptsTested[0]}", focus on digital PR and external mentions to improve entity salience.`,
        title: 'Live AI Visibility (Grounded)'
      });
    }
  }

  // 6. On-Page SEO
  if (evidence.content.h1.length === 1) {
    checks.push({ id: 'onpage-h1', category: 'On-Page SEO', status: 'pass', impact: 'high', effort: 'low', evidence: `1 H1 tag found: "${evidence.content.h1[0]}"`, recommendation: `Maintain the single H1 tag for clear page structure.`, title: 'Single H1' });
  } else {
    checks.push({ id: 'onpage-h1', category: 'On-Page SEO', status: 'warn', impact: 'high', effort: 'low', evidence: `${evidence.content.h1.length} H1 tags found.`, recommendation: `Because your homepage has ${evidence.content.h1.length} H1 tags, ensure exactly one H1 tag is used for the main topic.`, title: 'Single H1' });
  }

  if (evidence.content.h2.length > 0) {
    checks.push({ id: 'onpage-h2', category: 'On-Page SEO', status: 'pass', impact: 'med', effort: 'low', evidence: `Found ${evidence.content.h1.length} H1, ${evidence.content.h2.length} H2, and ${evidence.content.h3.length} H3 tags.`, recommendation: `Maintain the logical heading hierarchy.`, title: 'Heading Hierarchy' });
  } else {
    checks.push({ id: 'onpage-h2', category: 'On-Page SEO', status: 'warn', impact: 'med', effort: 'low', evidence: `Found ${evidence.content.h1.length} H1 and 0 H2 tags.`, recommendation: `Because 0 H2 tags were found under the H1, add H2 subheadings to structure your content better.`, title: 'Heading Hierarchy' });
  }

  const metaDesc = evidence.content.metaDescription;
  if (metaDesc && metaDesc.length >= 50 && metaDesc.length <= 160) {
    checks.push({ id: 'onpage-metadesc', category: 'On-Page SEO', status: 'pass', impact: 'high', effort: 'low', evidence: `Meta description is ${metaDesc.length} chars.`, recommendation: `Maintain this well-sized meta description.`, title: 'Meta Description' });
  } else if (metaDesc) {
    checks.push({ id: 'onpage-metadesc', category: 'On-Page SEO', status: 'warn', impact: 'high', effort: 'low', evidence: `Meta description is ${metaDesc.length} chars.`, recommendation: `Because the meta description is ${metaDesc.length} chars (outside the 50-160 range), rewrite it.`, title: 'Meta Description' });
  } else {
    checks.push({ id: 'onpage-metadesc', category: 'On-Page SEO', status: 'fail', impact: 'high', effort: 'low', evidence: `No meta description found.`, recommendation: `Because no meta description was found, add one between 50-160 characters.`, title: 'Meta Description' });
  }

  const titleTag = evidence.content.title;
  if (titleTag && titleTag.length >= 30 && titleTag.length <= 60) {
    checks.push({ id: 'onpage-title', category: 'On-Page SEO', status: 'pass', impact: 'high', effort: 'low', evidence: `Title tag is ${titleTag.length} chars.`, recommendation: `Maintain this well-sized title tag.`, title: 'Title Tag Length' });
  } else if (titleTag) {
    checks.push({ id: 'onpage-title', category: 'On-Page SEO', status: 'warn', impact: 'high', effort: 'low', evidence: `Title tag is ${titleTag.length} chars.`, recommendation: `Because the title tag is ${titleTag.length} chars (outside 30-60 range), optimize it.`, title: 'Title Tag Length' });
  } else {
    checks.push({ id: 'onpage-title', category: 'On-Page SEO', status: 'fail', impact: 'high', effort: 'low', evidence: `No title tag found.`, recommendation: `Because no title tag was found, add one.`, title: 'Title Tag Length' });
  }

  const intro = evidence.content.firstParagraph;
  if (intro && intro.length >= 100) {
    checks.push({ id: 'onpage-intro', category: 'On-Page SEO', status: 'pass', impact: 'med', effort: 'med', evidence: `Intro paragraph is ${intro.length} chars. (${intro.slice(0, 80)}...)`, recommendation: `Maintain this substantive intro paragraph.`, title: 'Intro Paragraph Substance' });
  } else if (intro) {
    checks.push({ id: 'onpage-intro', category: 'On-Page SEO', status: 'warn', impact: 'med', effort: 'med', evidence: `Intro paragraph is only ${intro.length} chars.`, recommendation: `Because the intro paragraph is only ${intro.length} chars (below 100), expand it to quickly answer user queries.`, title: 'Intro Paragraph Substance' });
  } else {
    checks.push({ id: 'onpage-intro', category: 'On-Page SEO', status: 'warn', impact: 'med', effort: 'med', evidence: `No intro paragraph found immediately after H1.`, recommendation: `Because no paragraph was found after the H1, ensure you have substantive introductory text.`, title: 'Intro Paragraph Substance' });
  }

  const { total: imgTotal, withAlt: imgWithAlt } = evidence.content.imageAltCoverage;
  if (imgTotal > 0 && imgWithAlt === imgTotal) {
    checks.push({ id: 'onpage-alt', category: 'On-Page SEO', status: 'pass', impact: 'med', effort: 'med', evidence: `${imgWithAlt} of ${imgTotal} images have alt text.`, recommendation: `Maintain 100% alt text coverage.`, title: 'Image Alt Text' });
  } else if (imgTotal > 0 && imgWithAlt > 0) {
    checks.push({ id: 'onpage-alt', category: 'On-Page SEO', status: 'warn', impact: 'med', effort: 'med', evidence: `${imgWithAlt} of ${imgTotal} images have alt text.`, recommendation: `Because only ${imgWithAlt} of ${imgTotal} images have alt text, add descriptions to the remaining images.`, title: 'Image Alt Text' });
  } else if (imgTotal > 0) {
    checks.push({ id: 'onpage-alt', category: 'On-Page SEO', status: 'fail', impact: 'med', effort: 'med', evidence: `0 of ${imgTotal} images have alt text.`, recommendation: `Because 0 of ${imgTotal} images have alt text, add descriptive alt attributes.`, title: 'Image Alt Text' });
  } else {
    checks.push({ id: 'onpage-alt', category: 'On-Page SEO', status: 'manual', impact: 'med', effort: 'med', evidence: `No images found on page.`, recommendation: `If images are added, ensure they have alt text.`, title: 'Image Alt Text' });
  }

  if (evidence.content.internalLinksCount > 0) {
    checks.push({ id: 'onpage-internal-links', category: 'On-Page SEO', status: 'pass', impact: 'med', effort: 'low', evidence: `Found ${evidence.content.internalLinksCount} internal links.`, recommendation: `Maintain healthy internal linking.`, title: 'Internal Links' });
  } else {
    checks.push({ id: 'onpage-internal-links', category: 'On-Page SEO', status: 'warn', impact: 'med', effort: 'low', evidence: `Found 0 internal links.`, recommendation: `Because 0 internal links were found, add links pointing to other pages on your domain.`, title: 'Internal Links' });
  }

  if (evidence.content.hasLists) {
    checks.push({ id: 'onpage-lists', category: 'On-Page SEO', status: 'pass', impact: 'low', effort: 'low', evidence: `Lists (ul/ol) are present on the page.`, recommendation: `Maintain use of lists for readability.`, title: 'Lists Used' });
  } else {
    checks.push({ id: 'onpage-lists', category: 'On-Page SEO', status: 'warn', impact: 'low', effort: 'low', evidence: `No lists (ul/ol) found on the page.`, recommendation: `Because no lists were found, consider using bullet points to break up content.`, title: 'Lists Used' });
  }

  if (evidence.content.canonicalUrl) {
    checks.push({ id: 'onpage-canonical', category: 'On-Page SEO', status: 'pass', impact: 'high', effort: 'low', evidence: `Canonical tag found: ${evidence.content.canonicalUrl}`, recommendation: `Maintain the canonical tag.`, title: 'Canonical Tag' });
  } else {
    checks.push({ id: 'onpage-canonical', category: 'On-Page SEO', status: 'fail', impact: 'high', effort: 'low', evidence: `No canonical tag found.`, recommendation: `Because no canonical tag was found, add <link rel="canonical"> to prevent duplicate content issues.`, title: 'Canonical Tag' });
  }

  const ogs = [evidence.content.ogTitle, evidence.content.ogDescription, evidence.content.ogImage].filter(Boolean);
  if (ogs.length === 3) {
    checks.push({ id: 'onpage-og', category: 'On-Page SEO', status: 'pass', impact: 'low', effort: 'low', evidence: `All 3 core OG tags (title, desc, image) present.`, recommendation: `Maintain complete Open Graph tags.`, title: 'Open Graph Tags' });
  } else if (ogs.length > 0) {
    checks.push({ id: 'onpage-og', category: 'On-Page SEO', status: 'warn', impact: 'low', effort: 'low', evidence: `Only ${ogs.length} of 3 core OG tags present.`, recommendation: `Because only ${ogs.length} of 3 core OG tags were found, ensure og:title, og:description, and og:image are all populated.`, title: 'Open Graph Tags' });
  } else {
    checks.push({ id: 'onpage-og', category: 'On-Page SEO', status: 'fail', impact: 'low', effort: 'low', evidence: `0 core OG tags found.`, recommendation: `Because 0 OG tags were found, add og:title, og:description, and og:image.`, title: 'Open Graph Tags' });
  }

  return checks;
}
