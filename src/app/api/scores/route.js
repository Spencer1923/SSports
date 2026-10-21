//gets scores every 15 seconds
import { HEADERS, cachedJson } from "@/lib/espn";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const week = searchParams.get("week");

  try {
    const url = week ? `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=2` : "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

    // no-store: never reuse an old ESPN copy, so the first visitor after a quiet period still gets fresh scores
    const res = await fetch(url, { headers: HEADERS, cache: "no-store" });

    if (!res.ok) {
      // the CDN may share one copy for 10 seconds and never serve a stale one (third argument = 0)
      return cachedJson(data, 10, 0);
    }

    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    // catch network/parse errors
    return Response.json({ error: err.message }, { status: 500 });
  }
}
