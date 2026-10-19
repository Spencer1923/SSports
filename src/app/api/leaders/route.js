import { espnFetch, cachedJson } from "@/lib/espn";

// categories removed from the page
const HIDDEN_CATEGORIES = ["passesDefended", "puntYards", "totalTouchdowns", "totalPoints", "kickoffYards", "totalTackles", "receptions"];

// fetch JSON (remembered for `seconds`), returning null instead of throwing if anything goes wrong
// athlete and team links rarely change, so they default to 1 day
async function getJson(url, seconds = 86400) {
  try {
    const res = await espnFetch(url, seconds);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const raw = await getJson(
      "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/types/2/leaders?lang=en&region=us",
      600, // the leaderboard itself: 10 minutes
    );
    if (!raw?.categories) {
      return Response.json({ error: "Leaders feed unavailable" }, { status: 502 });
    }

    // team id -> games played (used by the QBR rule); stays empty if this lookup fails
    const teamGames = {};
    const standings = await getJson("https://site.api.espn.com/apis/v2/sports/football/nfl/standings", 300);
    standings?.children?.forEach((conf) =>
      conf.standings.entries.forEach((entry) => {
        const val = (name) => entry.stats.find((s) => s.name === name)?.value || 0;
        teamGames[entry.team.id] = val("wins") + val("losses") + val("ties");
      }),
    );

    const categories = await Promise.all(
      raw.categories
        .filter((c) => !HIDDEN_CATEGORIES.includes(c.name))
        .map(async (category) => {
          let candidates = category.leaders || [];

          // QBR rule: at least 14 pass attempts per team game played
          if (category.name === "quarterbackRating") {
            const checked = await Promise.all(
              candidates.map(async (leader) => {
                const teamId = leader.team?.$ref?.match(/teams\/(\d+)/)?.[1];
                const stats = await getJson(leader.statistics?.$ref, 3600); // a player's pass attempts: 1 hour
                const all = stats?.splits?.categories?.flatMap((c) => c.stats || []) || [];
                const attempts = all.find((s) => s.name === "passingAttempts")?.value;
                const games = teamGames[teamId];
                // if attempts or team games can't be read, keep the player instead of hiding him
                if (attempts === undefined || !games) return leader;
                return attempts >= 14 * games ? leader : null;
              }),
            );
            candidates = checked.filter(Boolean);
          }

          // top 5, resolving athlete + team links; a failed lookup drops only that row
          const leaders = (
            await Promise.all(
              candidates.slice(0, 5).map(async (leader) => {
                const [athlete, team] = await Promise.all([getJson(leader.athlete?.$ref), getJson(leader.team?.$ref)]);
                if (!athlete) return null;
                return {
                  displayValue: leader.displayValue,
                  athleteId: athlete.id,
                  athleteName: athlete.displayName,
                  headshot: athlete.headshot?.href,
                  teamLogo: team?.logos?.[0]?.href,
                };
              }),
            )
          ).filter(Boolean);

          return { name: category.name, displayName: category.displayName, leaders };
        }),
    );

    // skip any category that ended up with nobody in it
    return cachedJson({ categories: categories.filter((c) => c.leaders.length > 0) }, 600);
  } catch (err) {
    console.error("leaders route failed:", err); // prints the real error in your terminal
    return Response.json({ error: err.message }, { status: 500 });
  }
}
