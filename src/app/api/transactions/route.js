export async function GET() {
  try {
    // ESPN's league-wide transactions feed
    const res = await fetch(
      "https://site.api.espn.com/apis/site/v2/sports/football/nfl/transactions",
      { headers: { "User-Agent": "Mozilla/5.0" } },
    );
    if (!res.ok) {
      return Response.json({ error: `ESPN API returned ${res.status}` }, { status: 502 });
    }
    return Response.json(await res.json());
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}