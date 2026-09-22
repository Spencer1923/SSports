export async function GET(request, { params }) {
  // Next.js 15+ requires awaiting params
  const { teamId } = await params;

  try {
    // fetch team info, schedule, and roster all at once
    const [teamRes, scheduleRes, rosterRes] = await Promise.all([
      fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}`, {
        headers: { "User-Agent": "Mozilla/5.0" },
      }),
      fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/schedule`, {
        headers: { "User-Agent": "Mozilla/5.0" },
      }),
      fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/roster`, {
        headers: { "User-Agent": "Mozilla/5.0" },
      }),
    ]);

    // bail early if any request failed
    if (!teamRes.ok || !scheduleRes.ok || !rosterRes.ok) {
      return Response.json({ error: "One or more ESPN requests failed" }, { status: 502 });
    }

    // parse all three responses into JSON
    const team = await teamRes.json();
    const schedule = await scheduleRes.json();
    const roster = await rosterRes.json();

    // combine into one response so the frontend only needs one fetch
    return Response.json({ team: team.team, schedule, roster });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}