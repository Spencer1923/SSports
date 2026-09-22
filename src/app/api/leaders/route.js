export async function GET() {
  try {
    // step 1: get the raw leaders list (contains $ref links, not full data)
    const res = await fetch(
      "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/types/2/leaders?lang=en&region=us",
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );

    if (!res.ok) {
      return Response.json({ error: `ESPN API returned ${res.status}` }, { status: 502 });
    }

    const raw = await res.json();

    // step 2: for each category, resolve only the top 5 leaders' athlete + team refs
    const categories = await Promise.all(
      raw.categories.map(async (category) => {
        const top5 = category.leaders.slice(0, 5);

        const leaders = await Promise.all(
          top5.map(async (leader) => {
            // fetch the actual athlete and team data behind the $ref links
            const [athleteRes, teamRes] = await Promise.all([
              fetch(leader.athlete.$ref, { headers: { "User-Agent": "Mozilla/5.0" } }),
              fetch(leader.team.$ref, { headers: { "User-Agent": "Mozilla/5.0" } }),
            ]);
            const athlete = await athleteRes.json();
            const team = await teamRes.json();

            // return only the clean fields the frontend needs
            return {
              displayValue: leader.displayValue,
              athleteId: athlete.id,
              athleteName: athlete.displayName,
              headshot: athlete.headshot?.href,
              teamLogo: team.logos?.[0]?.href,
            };
          })
        );

        return {
          name: category.name,
          displayName: category.displayName,
          leaders,
        };
      })
    );

    return Response.json({ categories });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}