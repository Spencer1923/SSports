export async function GET() {
  try {
    // league-wide injuries endpoint
    const res = await fetch(
      "https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries",
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