export const HEADERS = { "User-Agent": "Mozilla/5.0" };

// fetch from ESPN and let Next.js remember the answer for `seconds`
export function espnFetch(url, seconds) {
  return fetch(url, { headers: HEADERS, next: { revalidate: seconds } });
}

// `seconds` = how long the CDN may reuse a copy; `swr` = how long it may serve an old one while refreshing
export function cachedJson(data, seconds, swr = seconds * 5) {
  const value = `public, s-maxage=${seconds}, stale-while-revalidate=${swr}`;
  return Response.json(data, {
    headers: {
      "Cache-Control": value,
      // Netlify's CDN reads this header first, so it follows the same rule
      "Netlify-CDN-Cache-Control": value,
    },
  });
}
