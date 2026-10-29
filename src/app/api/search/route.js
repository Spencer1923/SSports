import { espnFetch } from "@/lib/espn";

export async function GET(request) {
  const q = (new URL(request.url).searchParams.get("q") || "").trim();
  if (q.length < 2) return Response.json({ players: [] }); // too short to search

  try {
    // cached 10 minutes per search text
    const res = await espnFetch(`https://site.web.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(q)}&limit=6&type=player&sport=football&league=nfl`, 600);
    if (!res.ok) return Response.json({ players: [] });
    const data = await res.json();

    // keep only the few fields the dropdown needs
    const players = (data.items || []).map((p) => ({
      id: p.id,
      name: p.displayName,
      pos: p.position?.abbreviation,
      team: (p.label || "").replace("NFL - ", ""), // "NFL - Los Angeles Rams" -> "Los Angeles Rams"
      headshot: p.headshot?.href,
    }));
    return Response.json({ players });
  } catch {
    return Response.json({ players: [] });
  }
}