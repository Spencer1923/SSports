export async function GET() {
  try {
    // step 1: get list of all 32 teams
    const teamsRes = await fetch(
      "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams",
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!teamsRes.ok) {
      return Response.json({ error: `ESPN teams list returned ${teamsRes.status}` }, { status: 502 });
    }
    const teamsData = await teamsRes.json();
    const teams = teamsData.sports[0].leagues[0].teams;

    // step 2: fetch each team's season statistics in parallel
    const statsPerTeam = await Promise.all(
      teams.map(async ({ team }) => {
        const statsRes = await fetch(
          `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/types/2/teams/${team.id}/statistics`,
          { headers: { "User-Agent": "Mozilla/5.0" } }
        );
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
      })
    );

    return Response.json({ teams: statsPerTeam.filter(Boolean) });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}