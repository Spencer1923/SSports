import { espnFetch, cachedJson } from "@/lib/espn";

// American odds like "+580" or "-440" -> implied win chance (0 to 1)
function impliedProb(odds) {
  const v = Number(odds); // Number("+580") is 580, Number("-440") is -440
  if (!v) return null;
  return v > 0 ? 100 / (v + 100) : -v / (-v + 100);
}

// which ESPN "type" goes into which field
const FIELDS = { winLeague: "superBowl", winConference: "conference", winDivision: "division" };

export async function GET() {
  try {
    // futures move slowly: cache for 1 hour
    const res = await espnFetch("https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/futures", 3600);
    if (!res.ok) return Response.json({ error: `ESPN futures returned ${res.status}` }, { status: 502 });
    const data = await res.json();

    const teams = {}; // will look like { teamId: { superBowl, conference, division } }

    (data.items || []).forEach((item) => {
      const field = FIELDS[item.type];
      if (!field) return; // skips MVP, Rookie of the Year and the other player awards

      // one entry per team: { id, p } where p is the raw implied chance
      const entries = (item.futures?.[0]?.books || [])
        .map((b) => ({
          id: b.team?.$ref?.match(/teams\/(\d+)/)?.[1], // team id is inside the $ref link
          p: impliedProb(b.value),
        }))
        .filter((e) => e.id && e.p != null);

      // raw chances add up to MORE than 100% (the sportsbook's margin).
      // dividing by the total scales them back so they add up to exactly 100%
      const total = entries.reduce((sum, e) => sum + e.p, 0);
      entries.forEach((e) => {
        teams[e.id] = teams[e.id] || {};
        teams[e.id][field] = e.p / total;
      });
    });

    return cachedJson({ teams }, 3600);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}