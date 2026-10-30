import { HEADERS, cachedJson } from "@/lib/espn";

// keep only the play fields the pages read (ESPN plays carry lots of $ref links we never use)
function slimPlay(p) {
  return {
    id: p.id,
    text: p.text,
    type: p.type,
    period: p.period,
    clock: p.clock,
    awayScore: p.awayScore,
    homeScore: p.homeScore,
    scoringPlay: p.scoringPlay,
    isTurnover: p.isTurnover,
    start: p.start, // DriveList + LiveDriveBanner read down/distance/yard line
    end: p.end,
  };
}

// same idea for a drive: keep its summary fields, slim its plays
const slimDrive = (d) => ({ ...d, plays: (d.plays || []).map(slimPlay) });

export async function GET(request, { params }) {
  const { gameId } = await params; // Next 15+ requires awaiting params

  try {
    // no-store: never reuse an old ESPN copy, because a game can change from upcoming to live at any moment
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${gameId}`, { headers: HEADERS, cache: "no-store" });

    if (!res.ok) {
      return Response.json({ error: `ESPN API returned ${res.status}` }, { status: 502 });
    }

    const data = await res.json();

    // only the pieces the game page and its components read
    const slim = {
      boxscore: data.boxscore,
      header: data.header,
      gameInfo: data.gameInfo, // stadium and city
      winprobability: data.winprobability,
      scoringPlays: data.scoringPlays,
      drives: data.drives && {
        previous: (data.drives.previous || []).map(slimDrive),
        current: data.drives.current ? slimDrive(data.drives.current) : undefined,
      },
      // top-level plays only exist on some responses; WinProbability also reads plays from drives
      plays: Array.isArray(data.plays) ? data.plays.map(slimPlay) : undefined,
    };

    // cache by game state: finished games never change, live games change constantly
    const state = data.header?.competitions?.[0]?.status?.type?.state;
    // finished: a day. live: 10 seconds, never stale. upcoming: 1 minute, never stale
    const seconds = state === "post" ? 86400 : state === "in" ? 10 : 60;
    const swr = state === "post" ? 86400 : 0;

    return cachedJson(slim, seconds, swr);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
