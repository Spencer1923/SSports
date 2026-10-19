import { espnFetch, cachedJson } from "@/lib/espn";

export async function GET() {
  try {
    // ESPN's league-wide transactions feed; moves happen a few times a day, so 10 minutes is plenty
    const res = await espnFetch("https://site.api.espn.com/apis/site/v2/sports/football/nfl/transactions", 600);
    if (!res.ok) {
      return Response.json({ error: `ESPN API returned ${res.status}` }, { status: 502 });
    }
    return cachedJson(await res.json(), 600);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}