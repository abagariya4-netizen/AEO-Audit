import { collectEvidence } from './src/lib/audit/collect';
async function test() {
  const ev = await collectEvidence('https://thesleepcompany.in');
  console.log("Schema Org name:", ev.schema.jsonLd.find(s => ['Organization', 'WebSite', 'LocalBusiness'].includes(s['@type']))?.name);
  console.log("OG Site Name:", ev.content.ogSiteName);
  console.log("Title:", ev.content.title);
  console.log("Brand:", ev.authority.derivedBrandName);
}
test();
