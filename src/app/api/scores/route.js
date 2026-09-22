//javascript function to get ESPN API
export async function GET() {
  try {
    // fetch NFL scoreboard from ESPN's public API
    const res = await fetch(
      "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
      { headers: { "User-Agent": "Mozilla/5.0" } } // avoid ESPN blocking bare requests
    );

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