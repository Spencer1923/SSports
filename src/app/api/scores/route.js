//javascript function to get ESPN API
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const week = searchParams.get("week");

  try {
    const url = week ? `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=2` : "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });

    if (!res.ok) {
      // bubble up a clear error instead of silent failure
      return Response.json({ error: `ESPN API returned ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    // catch network/parse errors
    return Response.json({ error: err.message }, { status: 500 });
  }
}
