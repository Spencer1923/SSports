import { espnFetch, cachedJson } from "@/lib/espn";

export async function GET() {
  try {
    // ESPN's NFL news feed
    const res = await espnFetch("https://site.api.espn.com/apis/site/v2/sports/football/nfl/news", 300);

    if (!res.ok) {
      return cachedJson(data, 300);
    }

    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
