export async function GET() {
  try {
    // step 1: get the raw leaders list (contains $ref links, not full data)
    const res = await fetch("https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/types/2/leaders?lang=en&region=us", { headers: { "User-Agent": "Mozilla/5.0" } });

    if (!res.ok) {
      return Response.json({ error: `ESPN API returned ${res.status}` }, { status: 502 });
    }

    const raw = await res.json();
    // categories removed from the page
    const HIDDEN_CATEGORIES = ["passesDefended", "puntYards", "totalTouchdowns", "totalPoints", "kickoffYards", "totalTackles", "receptions"];

    // team id -> games played so far (wins + losses + ties), from the standings feed
    const standingsRes = await fetch("https://site.api.espn.com/apis/v2/sports/football/nfl/standings", { headers: { "User-Agent": "Mozilla/5.0" } });
    const standings = await standingsRes.json();
    const teamGames = {};
    standings.children?.forEach((conf) =>
      conf.standings.entries.forEach((entry) => {
        const val = (name) => entry.stats.find((s) => s.name === name)?.value || 0;
        teamGames[entry.team.id] = val("wins") + val("losses") + val("ties");
      }),
    );

    // step 2: for each category, resolve only the top 5 leaders' athlete + team refs
    const categories = await Promise.all(
      raw.categories
        .filter((c) => !HIDDEN_CATEGORIES.includes(c.name))
        .map(async (category) => {
          let candidates = category.leaders;

          // QBR qualifier: the NFL's own rule, at least 14 pass attempts per team game played
          if (category.name === "quarterbackRating") {
            const checked = await Promise.all(
              candidates.map(async (leader) => {
                try {
                  const teamId = leader.team.$ref.match(/teams\/(\d+)/)?.[1];
                  const statsRes = await fetch(leader.statistics.$ref, { headers: { "User-Agent": "Mozilla/5.0" } });
                  const stats = await statsRes.json();
                  const all = stats.splits?.categories?.flatMap((c) => c.stats || []) || [];
                  const attempts = all.find((s) => s.name === "passingAttempts")?.value;
                  const games = teamGames[teamId];
                  // if we can't read attempts or team games, keep the player instead of hiding him
                  if (attempts === undefined || !games) return leader;
                  return attempts >= 14 * games ? leader : null;
                } catch {
                  return leader;
                }
              }),
            );
            candidates = checked.filter(Boolean);
          }

          const top5 = candidates.slice(0, 5);

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
            }),
          );

          return {
            name: category.name,
            displayName: category.displayName,
            leaders,
          };
        }),
    );

    return Response.json({ categories });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
