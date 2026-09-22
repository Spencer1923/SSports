export async function GET() {
  try {
    // ESPN standings endpoint for NFL
    const res = await fetch(
      "https://site.api.espn.com/apis/v2/sports/football/nfl/standings",
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