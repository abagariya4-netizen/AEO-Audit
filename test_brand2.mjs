import * as cheerio from 'cheerio';

async function run() {
  const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';
  const url = 'https://thesleepcompany.in';
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    }
  });
  const text = await res.text();
  const $ = cheerio.load(text);

  console.log('--- Title ---');
  console.log($('title').text());
  
  console.log('--- OG site_name ---');
  console.log($('meta[property="og:site_name"]').attr('content'));

  console.log('--- JSON-LD blocks ---');
  const scripts = $('script[type="application/ld+json"]');
  scripts.each((i, el) => {
    try {
      let content = $(el).html() || '{}';
      content = content.trim().replace(/;+$/, '');
      const parsed = JSON.parse(content);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      arr.forEach(p => {
        if (['Organization','WebSite','LocalBusiness'].includes(p['@type'])) {
          console.log(`  @type=${p['@type']} name=${p.name}`);
        }
      });
    } catch (e) { }
  });
}
run();
