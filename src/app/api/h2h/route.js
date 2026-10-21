import { espnFetch, cachedJson } from "@/lib/espn";

const LAST_SEASON = 2025; // same number as the history route
const YEARS = 6; // how far back to look for meetings

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const team = searchParams.get("team");
  const opp = searchParams.get("opp");
  if (!team || !opp) return Response.json({ error: "team and opp are required" }, { status: 400 });

  try {
    const years = Array.from({ length: YEARS }, (_, i) => LAST_SEASON - i);

    // each past season's schedule for `team`, keeping only games against `opp`
    const perYear = await Promise.all(
      years.map(async (year) => {
        try {
          const res = await espnFetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${team}/schedule?season=${year}`, 86400);
          if (!res.ok) return [];
          const data = await res.json();
          return (data.events || []).flatMap((event) => {
            const comp = event.competitions?.[0];
            const self = comp?.competitors?.find((c) => c.team?.id === team);
            const other = comp?.competitors?.find((c) => c.team?.id === opp);
            const a = self?.score?.value;
            const b = other?.score?.value;
            if (!self || !other || a == null || b == null) return []; // not our opponent, or not played
            return [
              {
                id: event.id,
                date: event.date,
                year,
                week: event.week?.number,
                teamScore: a,
                oppScore: b,
                teamWon: !!self.winner,
                tie: !self.winner && !other.winner,
                home: self.homeAway === "home",
              },
            ];
          });
        } catch {
          return [];
        }
      })
    );

    // newest first
    const games = perYear.flat().sort((x, y) => new Date(y.date) - new Date(x.date));
    return cachedJson({ games }, 86400);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}