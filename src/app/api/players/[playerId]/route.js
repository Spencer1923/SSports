import { espnFetch, cachedJson } from "@/lib/espn";

export async function GET(request, { params }) {
  const { playerId } = await params;

  try {
    // ESPN's athlete overview endpoint: bio + season stats
    const res = await espnFetch(`https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${playerId}`, 3600);

    if (!res.ok) {
      return cachedJson(data, 3600);
    }

    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
