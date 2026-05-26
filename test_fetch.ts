import { collectEvidence } from './src/lib/audit/collect';

async function test() {
  const ev = await collectEvidence('https://www.microsoft.com');
  console.log("Status HTTPS:", ev.technical.https);
  console.log("First 500 html:", ev.technical.rawHtml?.substring(0, 500));
  console.log("Derived Brand:", ev.authority.derivedBrandName);
  console.log("Schema types:", ev.schema.jsonLd.map(s => s['@type']));
}

test();
