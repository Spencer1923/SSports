import { computeSeeds } from "@/lib/playoffs";

// how much each part counts (averaged, so they don't need to add to 1)
const W_MARKET = 0.45; // sportsbook Super Bowl odds
const W_RECORD = 0.2;
const W_PYTH = 0.1;
const W_SRS = 0.25; // the part that accounts for who a team played
const ROAD_EDGE = 0.03; // a road game is this much harder, a home game this much easier

// extra difficulty for facing a team from a tough division (added to that opponent's rating).
// Tier 1 is hardest. Every division not listed gets 0, which is the "easy" tier 8.
const DIVISION_BONUS = {
  "NFC West": 0.1, // tier 1
  "NFC North": 0.075, // tier 2
  "AFC North": 0.05, // tier 3
};

// looks up the bonus for a team id (0 if its division isn't listed)
const divBonus = (meta, teamId) => DIVISION_BONUS[meta[teamId]?.division] ?? 0;

// pulls a win % toward .500 by adding 4 "average" games
const shrinkPct = (p, games) => (p * games + 4) / (games + 8);

// Super Bowl odds -> 0-1 rating per team, by RANK (best 0.72, worst 0.28)
function marketRatings(futures) {
  const ids = Object.keys(futures || {})
    .filter((id) => futures[id].superBowl != null)
    .sort((a, b) => futures[b].superBowl - futures[a].superBowl);
  const out = {};
  ids.forEach((id, i) => (out[id] = 0.72 - 0.44 * (i / Math.max(1, ids.length - 1))));
  return out;
}

// one 0-1 strength rating per team, built from finished games (+ futures if we have them)
export function buildRatings(games, meta, futures) {
  // current records, from the no-picks standings
  const base = computeSeeds(games, {}, meta);
  const rec = {};
  ["AFC", "NFC"].forEach((c) => base[c].forEach((t) => (rec[t.id] = { w: t.w, l: t.l, t: t.t })));

  const cap = (m) => Math.max(-24, Math.min(24, m)); // blowouts count as 24 at most
  const stats = {};
  Object.keys(meta).forEach((id) => (stats[id] = { pf: 0, pa: 0, list: [] }));

  games
    .filter((g) => g.completed)
    .forEach((g) => {
      const h = Number(g.homeScore);
      const a = Number(g.awayScore);
      stats[g.homeId].pf += h;
      stats[g.homeId].pa += a;
      stats[g.homeId].list.push({ opp: g.awayId, margin: cap(h - a) });
      stats[g.awayId].pf += a;
      stats[g.awayId].pa += h;
      stats[g.awayId].list.push({ opp: g.homeId, margin: cap(a - h) });
    });

  // SRS: average margin + average rating of opponents, repeated until it settles
  let srs = {};
  Object.keys(meta).forEach((id) => (srs[id] = 0));
  for (let i = 0; i < 20; i++) {
    const next = {};
    Object.keys(meta).forEach((id) => {
      const list = stats[id].list;
      next[id] = list.reduce((sum, x) => sum + x.margin + srs[x.opp], 0) / (list.length + 4);
    });
    srs = next;
  }

  const market = marketRatings(futures);
  const rating = {};
  Object.keys(meta).forEach((id) => {
    const r = rec[id];
    const g = r.w + r.l + r.t;
    const s = stats[id];

    const recordPart = shrinkPct(g ? (r.w + r.t / 2) / g : 0.5, g);
    const pf = Math.pow(s.pf, 2.37);
    const pa = Math.pow(s.pa, 2.37);
    const pythPart = shrinkPct(pf + pa ? pf / (pf + pa) : 0.5, g);
    const srsPart = Math.min(0.9, Math.max(0.1, 0.5 + 0.028 * srs[id]));

    const parts = [
      [W_RECORD, recordPart],
      [W_PYTH, pythPart],
      [W_SRS, srsPart],
    ];
    if (market[id] != null) parts.push([W_MARKET, market[id]]);
    const total = parts.reduce((sum, [w]) => sum + w, 0);
    rating[id] = parts.reduce((sum, [w, v]) => sum + w * v, 0) / total;
  });
  return rating;
}

// strength of schedule: average rating of the opponents a team has already played.
// For each team, opponents are rated WITHOUT their game against that team,
// so a team that beat someone badly doesn't make that opponent look weaker.
export function computeSOS(games, meta, futures) {
  const out = {};

  // rate every team once, using all games. Reused by every team that doesn't need leave-one-out
  const full = buildRatings(games, meta, futures);

  Object.keys(meta).forEach((id) => {
    // leave-one-out only for teams with a winning record; losing teams use everyone's normal rating
    const rec = games.filter((g) => g.completed && (g.homeId === id || g.awayId === id));
    const wins = rec.filter((g) => (g.homeId === id ? g.homeScore > g.awayScore : g.awayScore > g.homeScore)).length;
    const winning = rec.length > 0 && wins / rec.length > 0.5;
    const rating = winning
      ? buildRatings(
          games.filter((g) => g.homeId !== id && g.awayId !== id),
          meta,
          futures,
        )
      : full;

    let sum = 0;
    let count = 0;
    games.forEach((g) => {
      if (!g.completed) return; // played games only
      if (g.homeId === id) {
        sum += rating[g.awayId] + divBonus(meta, g.awayId) - ROAD_EDGE; // home game: easier
        count++;
      } else if (g.awayId === id) {
        sum += rating[g.homeId] + divBonus(meta, g.homeId) + ROAD_EDGE; // road game: harder
        count++;
      }
    });

    out[id] = { games: count, sos: count ? sum / count : 0.5 };
  });

  return out;
}
