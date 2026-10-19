import { espnFetch, cachedJson } from "@/lib/espn";
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

        return {
          teamId: team.id,
          teamName: team.displayName,
          logo: team.logos?.[0]?.href,
          color: team.color,
          stats: statMap,
        };
      }),
    );

    return cachedJson({ teams: statsPerTeam.filter(Boolean) }, 600);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
