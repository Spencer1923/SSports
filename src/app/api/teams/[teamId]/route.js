export async function GET(request, { params }) {
  // Next.js 15+ requires awaiting params
  const { teamId } = await params;

  try {
    // ESPN endpoint for a single team's info + roster
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );

    if (!res.ok) {
      return Response.json({ error: `ESPN API returned ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}