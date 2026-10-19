export const HEADERS = { "User-Agent": "Mozilla/5.0" };

// fetch from ESPN and let Next.js remember the answer for `seconds`
export function espnFetch(url, seconds) {
  return fetch(url, { headers: HEADERS, next: { revalidate: seconds } });
}

// JSON response the CDN may cache for `seconds`; `swr` = how long it may serve the old copy while refreshing
export function cachedJson(data, seconds, swr = seconds * 5) {
  return Response.json(data, {
    headers: { "Cache-Control": `public, s-maxage=${seconds}, stale-while-revalidate=${swr}` },
  });
}
