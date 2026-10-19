import { cachedJson } from "@/lib/espn";
// Pulls all 18 regular-season weeks from ESPN and returns a small, clean
// list of games + a lookup of teams, so the client can do all the standings math.

const BASE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

// fetch one week's scoreboard (seasontype=2 means regular season)
async function fetchWeek(week) {
  const res = await fetch(`${BASE}?week=${week}&seasontype=2`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 300 }, // cache ESPN's answer for 5 minutes so we don't hit it on every visit
  });
  if (!res.ok) throw new Error(`ESPN returned ${res.status} for week ${week}`);
  return res.json();
}

export async function GET() {
  try {
    // weeks 1..18, all requested at the same time (much faster than one by one)
    const weeks = Array.from({ length: 18 }, (_, i) => i + 1);
    const results = await Promise.all(weeks.map(fetchWeek));

    const games = [];
    const teams = {}; // team id -> info, filled in as we see each team

    results.forEach((data, i) => {
      const week = i + 1;
      (data.events || []).forEach((event) => {
        const comp = event.competitions?.[0];
        const home = comp?.competitors?.find((c) => c.homeAway === "home");
        const away = comp?.competitors?.find((c) => c.homeAway === "away");
        if (!home || !away) return; // skip anything malformed

        // remember each team once (displayName lets us look up division in divisions.js)
        [home, away].forEach((c) => {
          teams[c.team.id] = {
            id: c.team.id,
            abbr: c.team.abbreviation,
            name: c.team.displayName,
            logo: c.team.logo,
          };
        });

        const completed = comp.status?.type?.completed === true;

        games.push({
          id: event.id,
          week,
          homeId: home.team.id,
          awayId: away.team.id,
          completed,
          // ESPN sends scores as strings; only trust them once the game is final
          homeScore: completed ? Number(home.score) : null,
          awayScore: completed ? Number(away.score) : null,
        });
      });
    });

    // the CDN may keep the combined result for 5 minutes (same as the fetch cache above),
    // so most visitors never trigger the 18 ESPN calls
    return cachedJson({ games, teams }, 300);
  } catch (err) {
    // if any week fails, fail loudly so the simulator never shows wrong standings
    return Response.json({ error: err.message }, { status: 502 });
  }
}
