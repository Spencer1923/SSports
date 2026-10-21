import { espnFetch, HEADERS, cachedJson } from "@/lib/espn";

// the most recent finished season. Change this number each year after the season ends
const LAST_SEASON = 2025;
const YEARS = 5; // how many past seasons to show

export async function GET(request, { params }) {
  const { teamId } = await params; // Next 15+ requires awaiting params

  try {
    const years = Array.from({ length: YEARS }, (_, i) => LAST_SEASON - i);

    const seasons = await Promise.all(
      years.map(async (year) => {
        try {
          // no-store: skip Next's data cache; the CDN header below still caches the final result
          const res = await fetch(`https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/${year}/types/2/teams/${teamId}/records`, { headers: HEADERS, cache: "no-store" });
          if (!res.ok) {
            return null;
          }
          const data = await res.json();
          const overall = (data.items || []).find((r) => r.name === "overall");
          if (!overall) return null;
          const stat = (name) => overall.stats?.find((s) => s.name === name);
          return {
            year,
            record: overall.summary, // e.g. "14-3"
            diff: stat("pointDifferential")?.displayValue ?? null, // e.g. "+191"
            seed: stat("playoffSeed")?.value ?? null,
          };
        } catch (err) {
          return null; // one missing season shouldn't break the others
        }
      }),
    );

    return cachedJson({ seasons: seasons.filter(Boolean) }, 86400);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
