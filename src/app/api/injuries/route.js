import { espnFetch, cachedJson } from "@/lib/espn";

export async function GET() {
  try {
    // league-wide injuries endpoint
    const res = await espnFetch("https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries", 600);

    if (!res.ok) {
      return cachedJson(data, 600);
    }

    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
