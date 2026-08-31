const BASE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";

const cache = new Map();
const TTL_NEWS = 10 * 60 * 1000;

async function cached(key, ttlMs, fetcher) {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.data;
  const data = await fetcher();
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  return data;
}

async function getJSON(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`ESPN API ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function getNFLNews(limit = 10) {
  return cached(`news:${limit}`, TTL_NEWS, async () => {
    const data = await getJSON(`/news?limit=${limit}`);
    return (data.articles || []).map((a) => ({
      id: a.id,
      title: a.headline,
      body: a.description,
      postedAt: a.published,
      link: a.links?.web?.href || null,
      image: a.images?.[0]?.url || null,
    }));
  });
}

module.exports = { getNFLNews };
