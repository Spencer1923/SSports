import { HEADERS, cachedJson } from "@/lib/espn";

// player id lives inside ESPN's player-card link, e.g. ".../id/5099542/name"
const playerId = (a) => a?.id || a?.links?.[0]?.href?.match(/\/id\/(\d+)/)?.[1] || null;

export async function GET() {
  try {
    // cache: "no-store" because the raw response is over Next's 2 MB cache limit
    const res = await fetch("https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries", { headers: HEADERS, cache: "no-store" });
    if (!res.ok) {
      return Response.json({ error: `ESPN API returned ${res.status}` }, { status: 502 });
    }
    const data = await res.json();

    // keep only what the injuries page reads
    const slim = {
      injuries: (data.injuries || []).map((team) => ({
        id: team.id,
        displayName: team.displayName,
        injuries: (team.injuries || []).map((i) => ({
          id: i.id,
          status: i.status,
          athlete: { id: playerId(i.athlete), displayName: i.athlete?.displayName },
          details: { type: i.details?.type },
        })),
      })),
    };

    return cachedJson(slim, 600);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}