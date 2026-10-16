const BASE = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";
const HEADERS = { headers: { "User-Agent": "Mozilla/5.0" } };

// "-3.5", "+150", "o47.5", "EVEN" -> number (or null)
function num(v) {
  if (v === null || v === undefined || v === "") return null;
  if (String(v).toUpperCase() === "EVEN") return 100;
  const cleaned = String(v)
    .replace("\u2212", "-")
    .replace(/[^\d.+-]/g, "");
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

  // each team's depth chart (cached for an hour), used to decide which injured players matter
  const depthFor = async (teamId) => {
    try {
      const r = await fetch(`${BASE}/teams/${teamId}/depthcharts`, {
        ...HEADERS,
        next: { revalidate: 3600 },
      });
      return r.ok ? await r.json() : null;
    } catch {
      return null;
    }
  };
  const [depthHome, depthAway] = await Promise.all([depthFor(home.id), depthFor(away.id)]);

  // all providers from the summary, falling back to the scoreboard's odds
  const pick = summary?.pickcenter?.length ? summary.pickcenter : comp.odds || [];
  const lines = pick.map((o) => normalizeLine(o, home.abbr));

  // against-the-spread record for a team
  const atsFor = (teamId) => {
    const entry = summary?.againstTheSpread?.find((a) => a.team?.id === teamId);
    const rec = entry?.records?.find((r) => /overall|ats/i.test(`${r.type} ${r.displayName}`)) || entry?.records?.[0];
    return rec?.summary || null;
  };

  // ESPN's own model: pregame predictor, else the first win-probability point
  const proj = num(summary?.predictor?.homeTeam?.gameProjection);
  const wp0 = num(summary?.winprobability?.[0]?.homeWinPercentage);
  const modelHome = proj !== null ? proj / 100 : wp0 === null ? null : wp0 > 1 ? wp0 / 100 : wp0;

  // weather + whether the stadium is a dome (weather doesn't matter indoors)
  const w = summary?.gameInfo?.weather;
  const indoor = !!summary?.gameInfo?.venue?.indoor;
  const weather =
    indoor || w
      ? {
          indoor,
          temp: num(w?.temperature ?? w?.highTemperature),
          condition: w?.displayValue || w?.conditionText || null,
          wind: num(w?.gust),
          rain: num(w?.precipitation),
        }
      : null;

  // lower number = more likely to miss this game
  const injuryRank = (s = "") => {
    const t = s.toLowerCase();
    if (t.includes("reserve") || t.includes("season")) return 3; // long-term, least relevant to this game
    if (t.includes("out")) return 0;
    if (t.includes("doubtful")) return 1;
    if (t.includes("questionable") || t.includes("day")) return 2; // includes "Day-To-Day"
    return 4;
  };

  // return man / holder / long snapper slots don't count as "starting" jobs
  const MINOR_SLOTS = ["kr", "pr", "h", "ls"];

  // how deep to go on the depth chart: 0 = starters only, 1 = starters + 2nd string, 2 = also 3rd string
  const MAX_DEPTH = 1;

  // kickers and punters only count if they're THE kicker or punter
  const SPECIALISTS = ["pk", "p"];

  // keep an injured player if he's a starter, a 2nd-stringer, or next in line because everyone ahead of him is hurt
  function importantInjuries(injuries, depth) {
    // slot name (qb, wr1, lt...) -> athlete ids in depth order; the first formation to list a slot wins
    const slots = {};
    depth?.depthchart?.forEach((formation) => {
      Object.entries(formation.positions || {}).forEach(([key, slot]) => {
        if (!MINOR_SLOTS.includes(key) && !slots[key]) {
          slots[key] = (slot.athletes || []).map((a) => String(a.id));
        }
      });
    });

    const hurtIds = new Set(injuries.map((i) => i.id));
    const kept = [];

    injuries.forEach((inj) => {
      // find this player's best (lowest) spot on the depth chart
      let best = null;
      Object.entries(slots).forEach(([key, ids]) => {
        const idx = ids.indexOf(inj.id);
        if (idx !== -1 && (best === null || idx < best.idx)) best = { key, idx, ids };
      });
      if (!best) return; // not on the depth chart (practice squad, special teams only, etc.)

      const maxDepth = SPECIALISTS.includes(best.key) ? 0 : MAX_DEPTH;
      const inRotation = best.idx <= maxDepth;
      const isBackupQB = best.key === "qb" && best.idx === 1;
      // everyone ahead of him at this spot is hurt too, so he's the one actually playing
      const nextManUp = best.idx > 0 && best.ids.slice(0, best.idx).every((id) => hurtIds.has(id));
      if (!(inRotation || isBackupQB || nextManUp)) return;

      // label: "LCB" for the starter, "LCB · 2nd" for a backup
      const key = best.key.toUpperCase();
      const label = best.idx === 0 ? key : `${key} · ${best.idx + 1}${best.idx === 1 ? "nd" : best.idx === 2 ? "rd" : "th"}`;
      kept.push({ ...inj, depthIdx: best.idx, role: label });
    });
    return kept;
  }

  const keyInjuries = (teamId, depth) => {
    const entry = summary?.injuries?.find((i) => String(i.team?.id ?? i.id) === String(teamId));
    const all = (entry?.injuries || [])
      .map((i) => ({
        id: String(i.athlete?.id ?? ""),
        name: i.athlete?.displayName,
        pos: i.athlete?.position?.abbreviation,
        // status is usually text like "Questionable", but guard in case it's an object
        status: typeof i.status === "string" ? i.status : i.status?.type || i.status?.name || "",
      }))
      .filter((i) => i.name);

    // if the depth chart didn't load, fall back to anyone Out/Doubtful plus any QB
    const shown = depth ? importantInjuries(all, depth) : all.filter((i) => injuryRank(i.status) <= 1 || i.pos === "QB").map((i) => ({ ...i, role: i.pos }));

    // worst status first, then QBs, then higher on the depth chart (starters before backups)
    const list = shown.sort((a, b) => injuryRank(a.status) - injuryRank(b.status) || (b.pos === "QB") - (a.pos === "QB") || (a.depthIdx ?? 0) - (b.depthIdx ?? 0)).slice(0, 10);

    return { list, hidden: all.length - list.length }; // hidden = injured players left off the list
  };

  const injAway = keyInjuries(away.id, depthAway);
  const injHome = keyInjuries(home.id, depthHome);

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
    weather,
    injuriesAway: injAway.list,
    injuriesHome: injHome.list,
    hiddenAway: injAway.hidden,
    hiddenHome: injHome.hidden,
    _raw: pick[0] || null, // first raw odds entry, returned once as "debug"
  };
}

export async function GET(request) {
  const week = new URL(request.url).searchParams.get("week");
  try {
    const url = week ? `${BASE}/scoreboard?week=${week}&seasontype=2` : `${BASE}/scoreboard`;
    const res = await fetch(url, HEADERS);
    if (!res.ok) {
      return Response.json({ error: `ESPN API returned ${res.status}` }, { status: 502 });
    }
    const board = await res.json();

    const games = (await Promise.all(board.events.map((e) => loadGame(e).catch(() => null)))).filter(Boolean);

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
