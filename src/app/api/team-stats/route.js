import { espnFetch, cachedJson } from "@/lib/espn";

// adds up the points scored AGAINST each team, using finished games from the scoreboard
async function getPointsAllowed() {
  const weeks = Array.from({ length: 18 }, (_, i) => i + 1); // weeks 1 to 18
  const allowed = {}; // will look like { teamId: { points: 0, games: 0 } }

  await Promise.all(
    weeks.map(async (week) => {
      // cached 10 minutes, so this is cheap after the first load
      const res = await espnFetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=2`, 600);
      if (!res.ok) return; // skip a week that fails

      const data = await res.json();
      data.events?.forEach((event) => {
        if (!event.status?.type?.completed) return; // only count finished games
        const teams = event.competitions?.[0]?.competitors || [];
        if (teams.length !== 2) return;

        // each team's "points allowed" is the OTHER team's score
        teams.forEach((team, i) => {
          const opponent = teams[1 - i];
          const id = team.team.id;
          if (!allowed[id]) allowed[id] = { points: 0, games: 0 };
          allowed[id].points += Number(opponent.score) || 0;
          allowed[id].games += 1;
        });
      });
    }),
  );

  return allowed;
}
export async function GET() {
  try {
    // step 1: get list of all 32 teams
    // the list of 32 teams basically never changes: cache for 1 day
    const teamsRes = await espnFetch("https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams", 86400);
    if (!teamsRes.ok) {
      return Response.json({ error: `ESPN teams list returned ${teamsRes.status}` }, { status: 502 });
    }
    const teamsData = await teamsRes.json();
    const teams = teamsData.sports[0].leagues[0].teams;

    // fetch points-allowed totals once, before the per-team loop
    const pointsAllowed = await getPointsAllowed();

    // step 2: fetch each team's season statistics in parallel
    const statsPerTeam = await Promise.all(
      teams.map(async ({ team }) => {
        // season stats only change when games finish: 10 minutes is plenty
        const statsRes = await espnFetch(`https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/types/2/teams/${team.id}/statistics`, 600);
        if (!statsRes.ok) return null;
        const statsData = await statsRes.json();

        // flatten into a simple { statName: value } map for this team
        const statMap = {};
        statsData.splits?.categories?.forEach((category) => {
          category.stats?.forEach((stat) => {
            statMap[stat.name] = stat.value;
          });
        });

        // points allowed per game = total points against / games played
        const pa = pointsAllowed[team.id];
        const pointsAllowedPerGame = pa ? pa.points / pa.games : 0;

        return {
          teamId: team.id,
          teamName: team.displayName,
          logo: team.logos?.[0]?.href,
          color: team.color,
          stats: { ...statMap, pointsAllowedPerGame }, // copy all stats and add our new one
        };
      }),
    );

    return cachedJson({ teams: statsPerTeam.filter(Boolean) }, 600);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
