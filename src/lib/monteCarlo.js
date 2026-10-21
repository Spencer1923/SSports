import { computeSeeds } from "@/lib/playoffs";

// chance team A beats team B, from their current win percentages (log5 formula).
// shrinkage pulls early-season records toward .500, since 5 games say little
function winProb(a, b, rec, home) {
  const shrink = (r) => {
    const g = r.w + r.l + r.t;
    return (r.w + r.t / 2 + 4) / (g + 8); // adds 4 "average" games
  };
  const pa = shrink(rec[a]);
  const pb = shrink(rec[b]);
  const base = (pa * (1 - pb)) / (pa * (1 - pb) + pb * (1 - pa)); // log5
  const adj = home === a ? 0.03 : -0.03; // small home-field edge
  return Math.min(0.95, Math.max(0.05, base + adj));
}

// runs `runs` simulated seasons; returns { teamId: { playoff, division, bye } } as 0-1 fractions
export function simulate(games, meta, runs = 2000, market = {}) {
  // current records, taken from the no-picks standings
  const base = computeSeeds(games, {}, meta);
  const rec = {};
  ["AFC", "NFC"].forEach((c) => base[c].forEach((t) => (rec[t.id] = { w: t.w, l: t.l, t: t.t })));

  const open = games.filter((g) => !g.completed);
  const tally = {};
  Object.keys(meta).forEach((id) => (tally[id] = { playoff: 0, division: 0, bye: 0 }));

  for (let n = 0; n < runs; n++) {
    // pick a random winner for every open game
    const picks = {};
    open.forEach((g) => {
      // use the market's home win chance when we have it, otherwise the record-based estimate
      const p = market[g.id] ?? winProb(g.homeId, g.awayId, rec, g.homeId);
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
