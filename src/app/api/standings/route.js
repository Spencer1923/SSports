import { espnFetch, cachedJson } from "@/lib/espn";

// only the stats the pages read (standings page + team page)
const KEEP = ["wins", "losses", "streak", "pointDifferential"];

export async function GET() {
  try {
    // ESPN standings, remembered by Next.js for 5 minutes
    const res = await espnFetch("https://site.api.espn.com/apis/v2/sports/football/nfl/standings", 300);

    if (!res.ok) {
      return Response.json({ error: `ESPN API returned ${res.status}` }, { status: 502 });
    }

    const data = await res.json();

    // rebuild the same shape ESPN uses, so no page code has to change
    const slim = {
      children: data.children.map((conf) => ({
        standings: {
          entries: conf.standings.entries.map((entry) => ({
            team: {
              id: entry.team.id,
              displayName: entry.team.displayName,
              logos: [{ href: entry.team.logos?.[0]?.href }],
            },
            // keep only the listed stats
            stats: entry.stats.filter((s) => KEEP.includes(s.name)).map((s) => ({ name: s.name, displayValue: s.displayValue, value: s.value })),
          })),
        },
      })),
    };

    // the CDN may cache this for 5 minutes
    return cachedJson(slim, 300);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}