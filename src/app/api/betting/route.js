const BASE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";
const HEADERS = { headers: { "User-Agent": "Mozilla/5.0" } };

// "-3.5", "+150", "o47.5", "EVEN" -> number (or null)
function num(v) {
  if (v === null || v === undefined || v === "") return null;
  if (String(v).toUpperCase() === "EVEN") return 100;
  const cleaned = String(v).replace("\u2212", "-").replace(/[^\d.+-]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// turns one ESPN odds entry into a clean object (homeSpread is negative when the home team is favored)
function normalizeLine(o, homeAbbr) {
  const away = o.awayTeamOdds || {};
  const home = o.homeTeamOdds || {};
  const raw = num(o.spread);
  const abs = raw === null ? null : Math.abs(raw);

  let homeSpread = null;
  if (abs === 0) homeSpread = 0;
  else if (abs !== null && home.favorite) homeSpread = -abs;
  else if (abs !== null && away.favorite) homeSpread = abs;
  else if (o.details) {
    // fallback: parse "BUF -3.5" (favorite abbreviation + line)
    const m = String(o.details).match(/^([A-Za-z.]+)\s+([+-]?[\d.]+)/);
    if (m) {
      const v = Math.abs(Number(m[2]));
      homeSpread = m[1].toUpperCase() === homeAbbr ? -v : v;
    }
  }
  if (homeSpread === null && raw !== null) homeSpread = raw;

  return {
    provider: o.provider?.name || "Book",
    homeSpread,
    total: num(o.overUnder),
    overOdds: num(o.overOdds),
    underOdds: num(o.underOdds),
    homeML: num(home.moneyLine),
    awayML: num(away.moneyLine),
    homeSpreadOdds: num(home.spreadOdds),
    awaySpreadOdds: num(away.spreadOdds),
    // opening numbers: only present if ESPN includes them
    openHomeSpread: num(o.pointSpread?.home?.open?.line),
    openTotal: num(o.total?.over?.open?.line ?? o.total?.under?.open?.line),
  };
}

// one game = scoreboard info + the detailed summary (all books, ATS, model)
async function loadGame(event) {
  const comp = event.competitions[0];
  const side = (ha) => comp.competitors.find((c) => c.homeAway === ha);
  const teamOf = (c) => ({
    id: c.team.id,
    abbr: c.team.abbreviation,
    name: c.team.displayName,
    logo: c.team.logo,
    color: c.team.color ? `#${c.team.color}` : null,
    record: c.records?.[0]?.summary || null,
    score: c.score ?? null,
  });
  const home = teamOf(side("home"));
  const away = teamOf(side("away"));

  let summary = null;
  try {
    const r = await fetch(`${BASE}/summary?event=${event.id}`, HEADERS);
    if (r.ok) summary = await r.json();
  } catch {}

  // all providers from the summary, falling back to the scoreboard's odds
  const pick = summary?.pickcenter?.length ? summary.pickcenter : comp.odds || [];
  const lines = pick.map((o) => normalizeLine(o, home.abbr));

  // against-the-spread record for a team
  const atsFor = (teamId) => {
    const entry = summary?.againstTheSpread?.find((a) => a.team?.id === teamId);
    const rec =
      entry?.records?.find((r) => /overall|ats/i.test(`${r.type} ${r.displayName}`)) || entry?.records?.[0];
    return rec?.summary || null;
  };

  // ESPN's own model: pregame predictor, else the first win-probability point
  const proj = num(summary?.predictor?.homeTeam?.gameProjection);
  const wp0 = num(summary?.winprobability?.[0]?.homeWinPercentage);
  const modelHome = proj !== null ? proj / 100 : wp0 === null ? null : wp0 > 1 ? wp0 / 100 : wp0;

  return {
    id: event.id,
    date: event.date,
    state: comp.status?.type?.state,
    detail: comp.status?.type?.detail,
    home,
    away,
    lines,
    atsHome: atsFor(home.id),
    atsAway: atsFor(away.id),
    modelHome,
    _raw: pick[0] || null, // first raw odds entry, returned once as "debug"
  };
}

export async function GET(request) {
  const week = new URL(request.url).searchParams.get("week");
  try {
    const url = week
      ? `${BASE}/scoreboard?week=${week}&seasontype=2`
      : `${BASE}/scoreboard`;
    const res = await fetch(url, HEADERS);
    if (!res.ok) {
      return Response.json({ error: `ESPN API returned ${res.status}` }, { status: 502 });
    }
    const board = await res.json();

    const games = (
      await Promise.all(board.events.map((e) => loadGame(e).catch(() => null)))
    ).filter(Boolean);

    const debug = games.find((g) => g._raw)?._raw || null;
    games.forEach((g) => delete g._raw);

    return Response.json({
      week: board.week?.number ?? (week ? Number(week) : null),
      games,
      debug,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}