import { computeSeeds } from "@/lib/playoffs";

// target: "playoff" | "division" | "bye"
// returns { status: "impossible" | "clinched" | "needs", games: [...] }
export function whatNeeds(games, meta, teamId, target) {
  const conf = meta[teamId].conference;

  // current wins (ties count half), used to decide which side of a rival game "hurts" our team
  const base = computeSeeds(games, {}, meta);
  const wins = {};
  ["AFC", "NFC"].forEach((c) => base[c].forEach((t) => (wins[t.id] = t.w + t.t / 2)));

  const open = games.filter((g) => !g.completed);

  // does this set of picks get the team to its goal?
  const met = (picks) => {
    const row = computeSeeds(games, picks, meta)[conf].find((t) => t.id === teamId);
    if (target === "division") return row.divWinner;
    if (target === "bye") return row.seed === 1;
    return row.inPlayoffs;
  };

  // best[g] = result that helps the team most, worst[g] = result that hurts most
  const best = {};
  const worst = {};
  const flip = (s) => (s === "home" ? "away" : "home");
  open.forEach((g) => {
    if (g.homeId === teamId || g.awayId === teamId) {
      best[g.id] = g.homeId === teamId ? "home" : "away"; // the team wins
    } else {
      const hc = meta[g.homeId].conference === conf;
      const ac = meta[g.awayId].conference === conf;
      if (hc && !ac) best[g.id] = "away"; // a conference rival should lose to an outsider
      else if (ac && !hc) best[g.id] = "home";
      else if (hc && ac) best[g.id] = wins[g.homeId] <= wins[g.awayId] ? "home" : "away"; // the weaker rival should win
      else best[g.id] = "home"; // neither team is in our conference: barely matters
    }
    worst[g.id] = flip(best[g.id]);
  });

  if (met(worst)) return { status: "clinched", games: [] };
  if (!met(best)) return { status: "impossible", games: [] };

  // start from the best case and flip games to their worst result while the goal still holds
  const cur = { ...best };
  const isOwn = (g) => g.homeId === teamId || g.awayId === teamId;
  const order = [...open].sort((a, b) => Number(isOwn(a)) - Number(isOwn(b))); // other teams' games first
  order.forEach((g) => {
    cur[g.id] = worst[g.id];
    if (!met(cur)) cur[g.id] = best[g.id]; // flipping broke it, so this result is needed
  });

  const needed = open
    .filter((g) => cur[g.id] === best[g.id])
    .map((g) => ({
      id: g.id,
      week: g.week,
      winnerId: best[g.id] === "home" ? g.homeId : g.awayId,
      loserId: best[g.id] === "home" ? g.awayId : g.homeId,
      own: isOwn(g),
    }))
    .sort((a, b) => a.week - b.week);

  return { status: "needs", games: needed };
}