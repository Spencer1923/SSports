import { espnFetch, cachedJson } from "@/lib/espn";

export async function GET(request, { params }) {
  const { playerId } = await params; // Next.js requires awaiting params
  const url = `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${playerId}/splits?region=us&lang=en&contentorigin=espn`;
  try {
    // season stats only change when games finish: cache for 1 hour
    const res = await espnFetch(url, 3600);
    if (!res.ok) {
      // temporary: show the URL we called and ESPN's reply so we can see what it disliked
      return Response.json({ error: `ESPN splits returned ${res.status}`, url, body: (await res.text()).slice(0, 300) }, { status: 502 });
    }
    const data = await res.json();

    // the first split of the first group is "All Splits" (the whole season)
    const all = data.splitCategories?.[0]?.splits?.[0]?.stats || [];

    return cachedJson(
      {
        labels: data.labels || [],
        fullNames: data.displayNames || [],
        categories: (data.categories || []).map((c) => ({ name: c.displayName, count: c.count })),
        stats: all, // one value per label, in the same order
      },
      3600,
    );
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
