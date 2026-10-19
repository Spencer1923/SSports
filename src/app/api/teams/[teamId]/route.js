import { espnFetch, cachedJson } from "@/lib/espn";

const BASE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams";

export async function GET(request, { params }) {
  // Next.js 15+ requires awaiting params
  const { teamId } = await params;

  try {
    // all four requests at once, each cached for as long as its data stays true
    const [teamRes, scheduleRes, rosterRes, depthRes] = await Promise.all([
      espnFetch(`${BASE}/${teamId}`, 300), // includes the team's record, so 5 minutes
      espnFetch(`${BASE}/${teamId}/schedule`, 300), // scores appear as games finish
      espnFetch(`${BASE}/${teamId}/roster`, 3600), // rosters change slowly: 1 hour
      espnFetch(`${BASE}/${teamId}/depthcharts`, 3600), // same for the depth chart
    ]);

    // bail early if any request failed
    if (!teamRes.ok || !scheduleRes.ok || !rosterRes.ok || !depthRes.ok) {
      return Response.json({ error: "One or more ESPN requests failed" }, { status: 502 });
    }

    // parse all four responses
    const team = await teamRes.json();
    const schedule = await scheduleRes.json();
    const roster = await rosterRes.json();
    const depth = await depthRes.json();

    // one combined response so the frontend only needs one fetch; the CDN may cache it for 5 minutes
    return cachedJson({ team: team.team, schedule, roster, depth }, 300);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
