import { DIVISIONS } from "@/lib/divisions";

// ---------- 1. TEAM INFO ----------
// Adds division + conference to each team from the API route, using divisions.js.
// Input: the `teams` object from /api/playoff-picture. Output: { teamId: { ...team, division, conference } }
export function buildMeta(teams) {
  const divisionByName = {};
  Object.entries(DIVISIONS).forEach(([div, names]) => names.forEach((n) => (divisionByName[n] = div)));

  const meta = {};
  Object.values(teams).forEach((t) => {
    const division = divisionByName[t.name]; // e.g. "AFC East"
    meta[t.id] = { ...t, division, conference: division?.slice(0, 3) }; // "AFC" or "NFC"
  });
  return meta;
}

// ---------- 2. RECORDS ----------
const blank = () => ({ w: 0, l: 0, t: 0, divW: 0, divL: 0, divT: 0, confW: 0, confL: 0, confT: 0, beat: [], played: [], h2h: {} });
const UP = { w: "W", l: "L", t: "T" }; // lets us build keys like "div" + "W"

// win % where a tie counts as half a win
const pct = (w, l, t) => {
  const g = w + l + t;
  return g ? (w + t / 2) / g : 0;
};
const winPct = (r) => pct(r.w, r.l, r.t);

// records one team's result (o = "w" | "l" | "t") against one opponent
function addResult(rec, meta, a, b, o) {
  const r = rec[a];
  r[o]++;
  r.played.push(b); // used for strength of schedule
  if (o === "w") r.beat.push(b); // used for strength of victory
  r.h2h[b] = r.h2h[b] || { w: 0, l: 0, t: 0 };
  r.h2h[b][o]++;
  if (meta[a].division === meta[b].division) r["div" + UP[o]]++;
  if (meta[a].conference === meta[b].conference) r["conf" + UP[o]]++;
}

// picks = { gameId: "home" | "away" }. Finished games use their real score;
// unfinished games use the pick; unpicked unfinished games are ignored.
function computeRecords(games, picks, meta) {
  const rec = {};
  Object.keys(meta).forEach((id) => (rec[id] = blank()));

  games.forEach((g) => {
    let result = null;
    if (g.completed) result = g.homeScore > g.awayScore ? "home" : g.awayScore > g.homeScore ? "away" : "tie";
    else if (picks[g.id]) result = picks[g.id];
    if (!result) return;

    addResult(rec, meta, g.homeId, g.awayId, result === "home" ? "w" : result === "away" ? "l" : "t");
    addResult(rec, meta, g.awayId, g.homeId, result === "away" ? "w" : result === "home" ? "l" : "t");
  });
  return rec;
}

// ---------- 3. TIEBREAKER STEPS ----------
// Each step gives a team a number (higher = better). If all tied teams get the
// same number, the step can't separate them and we move to the next step.

// combined win % of a list of opponents
const combined = (ids, rec) => {
  let w = 0;
  let g = 0;
  ids.forEach((id) => {
    const r = rec[id];
    w += r.w + r.t / 2;
    g += r.w + r.l + r.t;
  });
  return g ? w / g : 0;
};

// head-to-head: win % in games played only against the other tied teams
const h2hStep = (id, group, rec) => {
  let w = 0;
  let g = 0;
  group.forEach((other) => {
    if (other === id) return;
    const h = rec[id].h2h[other];
    if (h) {
      w += h.w + h.t / 2;
      g += h.w + h.l + h.t;
    }
  });
  return g ? w / g : 0; // no games between them -> everyone gets 0 -> step is skipped
};
const divStep = (id, group, rec) => pct(rec[id].divW, rec[id].divL, rec[id].divT); // division record
const confStep = (id, group, rec) => pct(rec[id].confW, rec[id].confL, rec[id].confT); // conference record
const sovStep = (id, group, rec) => combined(rec[id].beat, rec); // strength of victory
const sosStep = (id, group, rec) => combined(rec[id].played, rec); // strength of schedule

// teams in the same division, and teams from different divisions (seeds / wild card)
const DIV_STEPS = [h2hStep, divStep, confStep, sovStep, sosStep];
const WC_STEPS = [h2hStep, confStep, sovStep, sosStep];

// ---------- 4. RANKING ----------
// Splits a tied group using the steps in order. When a step splits the group,
// each smaller group restarts from the first step (like the real NFL rules).
function breakTies(group, steps, rec) {
  if (group.length <= 1) return group;

  for (const step of steps) {
    const scores = {};
    group.forEach((id) => (scores[id] = step(id, group, rec)));
    const distinct = [...new Set(Object.values(scores))].sort((a, b) => b - a);

    if (distinct.length > 1) {
      // one bucket per distinct score, best first, then re-break each bucket
      return distinct.flatMap((s) =>
        breakTies(
          group.filter((id) => scores[id] === s),
          steps,
          rec,
        ),
      );
    }
  }
  // nothing separated them (the real NFL uses a coin flip); sort by id so it's stable
  return [...group].sort((a, b) => Number(a) - Number(b));
}

// ranks team ids: best win % first, ties broken with the given steps
function rankTeams(ids, steps, rec) {
  const sorted = [...ids].sort((a, b) => winPct(rec[b]) - winPct(rec[a]));
  const groups = []; // teams with equal win % end up in the same group
  sorted.forEach((id) => {
    const last = groups[groups.length - 1];
    if (last && winPct(rec[last[0]]) === winPct(rec[id])) last.push(id);
    else groups.push([id]);
  });
  return groups.flatMap((g) => breakTies(g, steps, rec));
}

// ---------- 5. SEEDS ----------
// Returns { AFC: [...16 teams in seed order], NFC: [...] }.
// Seeds 1-4 = division winners, 5-7 = best wild cards; seed 8+ = out of the playoffs.
export function computeSeeds(games, picks, meta) {
  const rec = computeRecords(games, picks, meta);
  const out = {};

  ["AFC", "NFC"].forEach((conf) => {
    const ids = Object.keys(meta).filter((id) => meta[id].conference === conf);
    const divNames = Object.keys(DIVISIONS).filter((d) => d.startsWith(conf));

    // best team in each of the 4 divisions
    const winners = divNames.map(
      (d) =>
        rankTeams(
          ids.filter((id) => meta[id].division === d),
          DIV_STEPS,
          rec,
        )[0],
    );

    const rankedWinners = rankTeams(winners, WC_STEPS, rec); // seeds 1-4
    const rankedRest = rankTeams(
      ids.filter((id) => !winners.includes(id)),
      WC_STEPS,
      rec,
    ); // seeds 5-7 are the first three; the rest are eliminated

    out[conf] = [...rankedWinners, ...rankedRest].map((id, i) => ({
      id,
      seed: i + 1,
      inPlayoffs: i < 7,
      divWinner: i < 4,
      w: rec[id].w,
      l: rec[id].l,
      t: rec[id].t,
    }));
  });

  return out;
}

// ---------- 6. MOVEMENT ----------
// Compares the current seeds with the baseline (no picks).
// move > 0 moved up, move < 0 moved down, 0 = no change.
export function addMovement(current, baseline) {
  const out = {};
  Object.keys(current).forEach((conf) => {
    const baseSeed = {};
    baseline[conf].forEach((t) => (baseSeed[t.id] = t.seed));
    out[conf] = current[conf].map((t) => ({ ...t, move: baseSeed[t.id] - t.seed }));
  });
  return out;
}

// ---------- 7. REMAINING STRENGTH OF SCHEDULE ----------
// For each team: how many games are left, and the combined win % of those opponents.
// A game is "left" if it isn't final AND you haven't picked it (picked games count as played).
// Opponent records include your picks, so SOS updates as you click.
export function computeRemainingSOS(games, picks, meta) {
  const rec = computeRecords(games, picks, meta);
  const left = {}; // teamId -> list of remaining opponent ids
  Object.keys(meta).forEach((id) => (left[id] = []));

  games.forEach((g) => {
    if (g.completed || picks[g.id]) return;
    left[g.homeId].push(g.awayId);
    left[g.awayId].push(g.homeId);
  });

  const out = {};
  Object.keys(left).forEach((id) => {
    out[id] = { left: left[id].length, sos: combined(left[id], rec) }; // reuses the helper from step 3
  });
  return out;
}

// ---------- 8. PLAYED STRENGTH OF SCHEDULE ----------
// For each team: the combined win % of the opponents it has ALREADY played.
// Uses real results only (no picks), so it never changes when you click picks.
export function computePlayedSOS(games, meta) {
  const rec = computeRecords(games, {}, meta); // {} = ignore all picks
  const out = {};
  Object.keys(meta).forEach((id) => {
    out[id] = { played: rec[id].played.length, sos: combined(rec[id].played, rec) }; // reuses the helper from step 3
  });
  return out;
}
