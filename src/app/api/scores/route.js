//gets scores every 15 seconds
import { espnFetch, cachedJson } from "@/lib/espn";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const week = searchParams.get("week");

  try {
    const url = week ? `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=2` : "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

    const res = await espnFetch(url, 30);

    if (!res.ok) {
      // bubble up a clear error instead of silent failure
      return cachedJson(data, 10);
    }

    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    // catch network/parse errors
    return Response.json({ error: err.message }, { status: 500 });
  }
}
