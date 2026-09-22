export async function GET(request, { params }) {
  const { playerId } = await params;

  try {
    // ESPN's athlete overview endpoint: bio + season stats
    const res = await fetch(
      `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${playerId}`,
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