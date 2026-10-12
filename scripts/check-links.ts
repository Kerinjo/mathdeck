// Checks every learning resource URL. Run: npm run check-links
import { ALL_SKILLS, CHAPTERS } from '../src/content';

const urls = new Map<string, string[]>();
for (const s of ALL_SKILLS) for (const r of s.learn.resources) urls.set(r.url, [...(urls.get(r.url) ?? []), s.id]);
for (const c of CHAPTERS) for (const r of c.resources) urls.set(r.url, [...(urls.get(r.url) ?? []), c.id]);

async function probe(url: string) {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 mathdeck-link-check' } });
    return { url, status: res.status };
  } catch (e) {
    return { url, status: 0, error: (e as Error).message };
  }
}

// Retry once: a burst of parallel requests occasionally times out on slow sites.
const results = await Promise.all(
  [...urls.keys()].map(async (url) => {
    const first = await probe(url);
    return first.status >= 200 && first.status < 400 ? first : probe(url);
  }),
);

let bad = 0;
for (const r of results.sort((a, b) => a.status - b.status)) {
  const ok = r.status >= 200 && r.status < 400;
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'BAD'} ${r.status || 'ERR'}  ${r.url}${ok ? '' : `  (used by ${urls.get(r.url)!.join(', ')})`}`);
}
console.log(`\n${results.length - bad}/${results.length} links ok`);
process.exit(bad ? 1 : 0);
