import { espnFetch, cachedJson } from "@/lib/espn";

export async function GET(request, { params }) {
  const { playerId } = await params; // folder is [playerId]
  try {
    // game logs change when games finish: cache for 1 hour
    const res = await espnFetch(`https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${playerId}/gamelog`, 3600);
    if (!res.ok) return Response.json({ error: `ESPN gamelog returned ${res.status}` }, { status: 502 });
    const data = await res.json();

    // the current season's per-game stats (an event category holds one row per game)
    const cat = data.seasonTypes?.[0]?.categories?.find((c) => c.type === "event");
    const games = (cat?.events || []).map((e) => {
      const info = data.events?.[e.eventId] || {};
      const mine = info.homeTeamId === info.team?.id ? info.homeTeamScore : info.awayTeamScore; // this player's team
      const theirs = info.homeTeamId === info.team?.id ? info.awayTeamScore : info.homeTeamScore;
      return {
        id: e.eventId,
        week: info.week,
        atVs: info.atVs, // "@" or "vs"
        opp: info.opponent?.abbreviation,
        oppLogo: info.opponent?.logo,
        result: info.gameResult, // "W" or "L"
        score: `${mine}-${theirs}`,
        stats: e.stats, // one value per label
      };
    });

    return cachedJson(
      {
        labels: data.labels || [],
        categories: (data.categories || []).map((c) => ({ name: c.displayName, count: c.count })),
        games,
        totals: cat?.totals || [],
      },
      3600,
    );
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}