import { computeSeeds } from "@/lib/playoffs";

// how much each part counts (must add up to 1). Wins and losses count the most.
const W_MARKET = 0.8; // sportsbook Super Bowl odds
const W_RECORD = 0;
const W_PYTH = 0;
const W_SRS = 0.2; // the only part that accounts for who a team played

// turns Super Bowl odds into a 0-1 rating per team.
// We use RANK, not the raw percentages, because sportsbooks inflate longshot prices.
// Best team gets 0.72, worst gets 0.28, the rest are spread evenly between.
function marketRatings(futures) {
  const ids = Object.keys(futures || {})
    .filter((id) => futures[id].superBowl != null)
    .sort((a, b) => futures[b].superBowl - futures[a].superBowl); // best first
  const out = {};
  ids.forEach((id, i) => {
    out[id] = 0.72 - 0.44 * (i / Math.max(1, ids.length - 1));
  });
  return out;
}

// pulls a win % toward .500 by adding 4 "average" games (so a few games say little)
const shrinkPct = (p, games) => (p * games + 4) / (games + 8);

// builds one 0-1 strength rating per team from finished games only
function buildRatings(games, rec, meta, marketRating) {
  const stats = {}; // teamId -> { pf, pa, list: [{ opp, margin }] }
  // a win by more than 24 points counts as 24, so blowouts over bad teams can't pad a rating
  const cap = (m) => Math.max(-24, Math.min(24, m));
  Object.keys(meta).forEach((id) => (stats[id] = { pf: 0, pa: 0, list: [] }));

  games
    .filter((g) => g.completed)
    .forEach((g) => {
      const h = Number(g.homeScore);
      const a = Number(g.awayScore);
      stats[g.homeId].pf += h;
      stats[g.homeId].pa += a;
      stats[g.homeId].list.push({ opp: g.awayId, margin: cap(h - a) });
      stats[g.homeId].list.push({ opp: g.awayId, margin: h - a });
      stats[g.awayId].pf += a;
      stats[g.awayId].pa += h;
      stats[g.awayId].list.push({ opp: g.homeId, margin: cap(a - h) });
    });

  // SRS: a team's rating = its average margin + the average rating of its opponents.
  // We repeat the calculation until the numbers settle. The "+ 4" in the divisor
  // shrinks early-season ratings toward 0 (average), like the win % shrinkage.
  let srs = {};
  Object.keys(meta).forEach((id) => (srs[id] = 0));
  for (let i = 0; i < 20; i++) {
    const next = {};
    Object.keys(meta).forEach((id) => {
      const list = stats[id].list;
      const total = list.reduce((sum, x) => sum + x.margin + srs[x.opp], 0);
      next[id] = total / (list.length + 4);
    });
    srs = next;
  }

  const rating = {};
  Object.keys(meta).forEach((id) => {
    const r = rec[id];
    const g = r.w + r.l + r.t;
    const s = stats[id];
    // schedule strength = the average SRS of the opponents this team has played (0 = average)
    const avgOpp = s.list.length ? s.list.reduce((sum, x) => sum + srs[x.opp], 0) / s.list.length : 0;
    // each point of opponent SRS is worth about 2.8% win rate, so weak opponents pull the rating down
    const schedAdj = 0.028 * avgOpp;

    // 1. record, shrunk toward .500
    const recordPart = Math.min(0.9, Math.max(0.1, shrinkPct(g ? (r.w + r.t / 2) / g : 0.5, g) - schedAdj));

    // 2. Pythagorean: expected win % from points scored vs allowed, also shrunk
    const pf = Math.pow(s.pf, 2.37);
    const pa = Math.pow(s.pa, 2.37);
    const pythPart = Math.min(0.9, Math.max(0.1, shrinkPct(pf + pa ? pf / (pf + pa) : 0.5, g) - schedAdj));

    // 3. SRS turned into a win % (about 2.8% per point of margin), kept between 10% and 90%
    const srsPart = Math.min(0.9, Math.max(0.1, 0.5 + 0.028 * srs[id]));

    // list every part with its weight; the market part is skipped if we have no futures data
    const parts = [
      [W_RECORD, recordPart],
      [W_PYTH, pythPart],
      [W_SRS, srsPart],
    ];
    if (marketRating?.[id] != null) parts.push([W_MARKET, marketRating[id]]);

    // weighted average (dividing by the total weight keeps it correct either way)
    const totalWeight = parts.reduce((sum, [w]) => sum + w, 0);
    rating[id] = parts.reduce((sum, [w, v]) => sum + w * v, 0) / totalWeight;
  });
  return rating;
}
// chance team A beats team B, from their current win percentages (log5 formula).
// shrinkage pulls early-season records toward .500, since 5 games say little
function winProb(a, b, rating, home) {
  const pa = rating[a]; // blended strength rating (already shrunk)
  const pb = rating[b];
  const base = (pa * (1 - pb)) / (pa * (1 - pb) + pb * (1 - pa)); // log5
  const adj = home === a ? 0.03 : -0.03; // small home-field edge
  return Math.min(0.95, Math.max(0.05, base + adj));
}

// runs `runs` simulated seasons; returns { teamId: { playoff, division, bye } } as 0-1 fractions
export function simulate(games, meta, runs = 2000, market = {}, futures = null) {
  // current records, taken from the no-picks standings
  const base = computeSeeds(games, {}, meta);
  const rec = {};
  ["AFC", "NFC"].forEach((c) => base[c].forEach((t) => (rec[t.id] = { w: t.w, l: t.l, t: t.t })));

  // ratings are built once from finished games, then reused in every simulated season
  const rating = buildRatings(games, rec, meta, marketRatings(futures));
  const open = games.filter((g) => !g.completed);
  const tally = {};
  Object.keys(meta).forEach((id) => (tally[id] = { playoff: 0, division: 0, bye: 0 }));

  for (let n = 0; n < runs; n++) {
    // pick a random winner for every open game
    const picks = {};
    open.forEach((g) => {
      // use the market's home win chance when we have it, otherwise the record-based estimate
      const p = market[g.id] ?? winProb(g.homeId, g.awayId, rating, g.homeId);
      picks[g.id] = Math.random() < Math.min(0.98, Math.max(0.02, p)) ? "home" : "away";
    });

    const seeds = computeSeeds(games, picks, meta);
    ["AFC", "NFC"].forEach((c) =>
      seeds[c].forEach((t) => {
        if (t.inPlayoffs) tally[t.id].playoff++;
        if (t.divWinner) tally[t.id].division++;
        if (t.seed === 1) tally[t.id].bye++;
      }),
    );
  }

  const out = {};
  Object.keys(tally).forEach((id) => {
    out[id] = { playoff: tally[id].playoff / runs, division: tally[id].division / runs, bye: tally[id].bye / runs };
  });
  return out;
}
