
import * as cheerio from 'cheerio';

async function run() {
  const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';
  const url = 'https://www.microsoft.com';
  console.log("Fetching", url);
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
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("HTML First 500:");
  console.log(text.substring(0, 500));

  const $ = cheerio.load(text);
  const scripts = $('script[type="application/ld+json"]');
  const results = [];
  scripts.each((_, el) => {
    try {
      const parsed = JSON.parse($(el).html() || '{}');
      if (Array.isArray(parsed)) {
        results.push(...parsed);
      } else {
        results.push(parsed);
      }
    } catch (e) { }
  });
  console.log("Found JSON-LD count:", results.length);
  console.log(results.map(s => s['@type']));

  // brand fallback
  const og = $('meta[property="og:site_name"]').attr('content');
  const title = $('title').text();
  console.log("og:", og);
  console.log("title:", title);
}
run();
