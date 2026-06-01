# AEO Audit Tool — Methodology & Scoring

## What this tool does

It measures how well a website is set up to appear inside AI answer engines — ChatGPT, Perplexity, Google Gemini / AI Overviews, and Claude — when a user asks a question like *"What are the best mattresses in India?"*. This is **Answer Engine Optimization (AEO)**: not where you rank on a page of blue links, but whether AI systems can find, understand, trust, and cite your content inside their answers.

A user enters a domain, and the tool produces a scored, prioritized, evidence-backed audit with a concrete action plan.

---

## The core design principle: zero hallucination

The previous report failed because it invented recommendations and listed actions with no priority. This tool is built specifically to not repeat that. Every finding comes from data the tool actually fetched and verified. The pipeline is split into three strictly separated stages so that facts can never be invented:

1. **COLLECT** — fetch raw, verifiable signals from the live site and real APIs (robots.txt, llms.txt, sitemap, page HTML, JSON-LD schema, Wikipedia/Wikidata). No interpretation here — just evidence.
2. **EVALUATE** — deterministic, rule-based scoring against that evidence. No AI involved. The same site always produces the same score.
3. **SYNTHESIZE** — only here does the AI write a plain-English summary, and only from the evidence already collected. It is explicitly forbidden from adding facts. If no AI key is present, a templated summary is generated instead — the audit never depends on the model for its facts.

Anything that cannot be programmatically verified is labeled **"Needs manual verification"** — never asserted as fact, and never counted against the score.

---

## What the tool checks (6 categories)

**Technical Access (weight 20%)** — Can AI crawlers even read the site? Checks robots.txt for blocks on GPTBot, PerplexityBot, ClaudeBot, Google-Extended and others; presence of llms.txt and sitemap.xml; HTTPS; viewport tags, hreflang tags, and whether primary content exists in the raw HTML (not hidden behind JavaScript, which AI crawlers don't execute).

**On-Page SEO (weight 15%)** — Does the page use fundamental SEO best practices? Checks for a single H1, logical heading hierarchy, well-sized meta description and title tag, an answer-first introductory paragraph, image alt text coverage, internal linking, use of lists, canonical tag, and Open Graph tags.

**Content Structure (weight 20%)** — Is the content easy for an AI to extract and reuse? Checks for answer-first formatting, question-form headings, a real FAQ section, named statistics, and named quotations/citations — the signals that correlate with being cited in AI answers.

**Schema / Structured Data (weight 20%)** — Can AI understand the entities on the page? Parses JSON-LD and detects high-value types: Organization, Product, FAQPage, Article, Review/AggregateRating, WebSite.

**Authority / Entity (weight 15%)** — Is the brand a known entity? Checks Wikipedia and Wikidata for a matching entity, and verifies whether that entity's official-website claim (Wikidata P856) links back to the audited domain. Ambiguous matches are flagged for manual review rather than guessed.

**AI Visibility (weight 10%)** — The direct test: does the brand actually appear in AI answers? Uses Gemini's Google Search grounding to ask realistic buyer questions and checks whether the brand is mentioned, and alongside which competitors. (Requires an API key; unscored if unavailable, never faked.)

---

## How the score works

- Each check returns `pass` / `warn` / `fail` / `manual` / `unavailable`, plus the **evidence** it's based on, an **impact** rating, an **effort** rating, and a **specific recommendation** naming that evidence.
- The overall score (0–100) is a weighted roll-up of the scored checks only.
- **Manual and unavailable checks are excluded from the denominator** — a site never loses points because an optional check (e.g. a live-visibility API key) wasn't run. Those items appear in a separate "Needs manual verification" section as to-dos.
- If an entire category has no scored checks, its weight is removed from the total and the remaining categories are renormalized — so the score always reflects only what was actually measured.
- The result is fully deterministic: the same URL always returns the same score.

### Impact-to-points mapping

| Impact | Points per check |
|--------|-----------------|
| High   | 3               |
| Med    | 2               |
| Low    | 1               |

`pass` = full points · `warn` = 50% · `fail` = 0

---

## How to read a report (worked example)

Three real audits show the score discriminates correctly:

| Domain | Score | Why |
|--------|-------|-----|
| thesleepcompany.in | **100** | llms.txt present, 3 schema types (incl. FAQPage), question-form headings, named statistics — strong on every measurable signal |
| apple.com | **89** | Verified Wikipedia entity, but missing llms.txt and weaker on question-form headings |
| microsoft.com | **84** | 1 schema type only, no named statistics on the homepage, missing llms.txt |

A high score is not the end of the report. Even at 100, The Sleep Company surfaces two real action items: verify/add the Wikidata official-website (P856) backlink, and enable the live AI-visibility check. The message a 100 sends is: *"On everything we can measure programmatically you're strong — here are the items that need a human."*

---

## Honest limitations (by design, not oversight)

A few signals can't be verified reliably from a backend and are intentionally surfaced as manual to-dos rather than guessed:

- **Core Web Vitals / page speed** — needs the Google PageSpeed Insights API (optional key).
- **External brand mentions / citations** — needs a paid SEO data API; out of scope for v1.
- **Google Knowledge Panel & Business Profile** — not reliably auto-detectable; flagged for manual check.
- **Full JS-rendering diff** — the tool detects empty-JS-shell pages from raw HTML; the full render-and-compare is an optional enhancement.
- **Backlinks, Domain Authority, PPC, UX Heatmaps, Social Media Stats, and Content Traffic** — these require external paid APIs, OAuth into customer accounts, or tracking scripts on the target site. We explicitly refuse to invent or estimate these metrics.

These are listed plainly so the report is trusted: it claims only what it can prove.
