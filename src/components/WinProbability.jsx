"use client";
import { useMemo, useState } from "react";
import TeamLogo from "@/components/TeamLogo";

// ESPN gives 0-1; normalize in case it ever sends 0-100
const frac = (v) => (v > 1 ? v / 100 : (v ?? 0.5));
// period 1-4 = quarters, 5+ = overtime
const quarter = (n) => (n > 4 ? "OT" : `Q${n}`);

// entries that are bookkeeping, not real plays. Their win-prob change gets merged into the play before them.
// (a kickoff only counts as filler if it isn't a return TD or a turnover)
const ALWAYS_FILLER = ["timeout", "end period", "end of", "two-minute", "two minute", "coin toss", "extra point", "two-point", "two point", "2-point"];
function isFiller(play) {
  if (!play) return false;
  const t = (play.type?.text || "").toLowerCase();
  if (ALWAYS_FILLER.some((k) => t.includes(k))) return true;
  if (t.includes("kickoff")) return !(play.scoringPlay || play.isTurnover);
  return false;
}

export default function WinProbability({ plays = [], playSource, home, away }) {
  const [hover, setHover] = useState(null); // index of the point under the cursor/finger

  // lookup: playId -> play object. Plays can live at the top level or inside drives, so collect both.
  const playById = useMemo(() => {
    const map = {};
    const add = (p) => {
      if (p?.id) map[p.id] = p;
    };
    if (Array.isArray(playSource?.plays)) playSource.plays.forEach(add);
    (playSource?.drives?.previous || []).forEach((d) => (d.plays || []).forEach(add));
    (playSource?.drives?.current?.plays || []).forEach(add);
    return map;
  }, [playSource]);

  // "Play of the Game": merge related entries into events, then score each event
  const best = useMemo(() => {
    if (plays.length < 3) return null;
    const p = (i) => frac(plays[i].homeWinPercentage); // home win prob at point i
    const end = p(plays.length - 1);
    const final = end >= 0.98 || end <= 0.02; // game is over when the last point is ~0% or ~100%
    const homeWon = end > 0.5;

    // the last time the 50% line was crossed = the play after which the winner never trailed again
    let lastCross = -1;
    for (let k = plays.length - 1; k >= 1; k--) {
      if ((p(k - 1) - 0.5) * (p(k) - 0.5) < 0) {
        lastCross = k;
        break;
      }
    }

    // build events: filler entries (extra point, timeout...) join the play before them
    const events = [];
    for (let i = 1; i < plays.length; i++) {
      const play = playById[plays[i].playId];
      if (isFiller(play) && events.length) events[events.length - 1].to = i;
      else events.push({ i, from: i - 1, to: i, play });
    }

    // score each event and keep the highest
    let top = null;
    events.forEach((e) => {
      const delta = p(e.to) - p(e.from); // home's change across the whole event
      const crossed = (p(e.from) - 0.5) * (p(e.to) - 0.5) < 0; // lead change
      const decisive = final && e.from < lastCross && lastCross <= e.to; // winner never trailed after this
      const helpedWinner = final && delta > 0 === homeWon;

      let score = Math.abs(delta);
      if (crossed) score *= 1.25;
      if (helpedWinner) score *= 1.25;
      if (decisive) score *= 1.5;

      if (!top || score > top.score) {
        const tags = [];
        // turnover = ESPN's flag, or the play type says interception / fumble lost to the other team
        const turnoverType = /interception|fumble recovery \(opponent\)/i.test(e.play?.type?.text || "");
        if (e.play?.isTurnover || turnoverType) tags.push("Turnover");
        if (e.play?.scoringPlay) tags.push("Score");
        if (crossed) tags.push("Lead change");
        if (decisive) tags.push("Decided the game");
        top = { i: e.i, from: e.from, to: e.to, delta, tags, final, score };
      }
    });
    return top;
  }, [plays, playById]);

  if (plays.length < 2) return null;

  const homeColor = `#${home?.color || "D4AF37"}`;
  const awayColor = `#${away?.color || "8B0000"}`;
  const last = plays.length - 1;

  // chart is 100 wide x 40 tall; top = home certain to win, bottom = away certain to win
  const pts = plays.map((p, i) => [(i / last) * 100, 40 - frac(p.homeWinPercentage) * 40]);
  const line = pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `M0,20 ${pts.map(([x, y]) => `L${x.toFixed(2)},${y.toFixed(2)}`).join(" ")} L100,20 Z`;
  const homePct = Math.round(frac(plays[last].homeWinPercentage) * 100);

  // turn the pointer's x position into the nearest point index (mouse or touch)
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
    setHover(Math.round(x * last));
  };

  // the point shown in the info panel: hovered one, otherwise the Play of the Game
  const active = hover ?? best?.i ?? last;
  const activePlay = playById[plays[active].playId];
  const isBest = active === best?.i;
  // the best play's swing covers its whole sequence (e.g. TD + extra point); other points are a single step
  const from = isBest ? best.from : active - 1;
  const to = isBest ? best.to : active;
  const activeDelta = active > 0 ? frac(plays[to].homeWinPercentage) - frac(plays[from].homeWinPercentage) : null;
  const benefited = activeDelta > 0 ? home : away; // team whose chances went up
  const potgLabel = best?.final ? "Play of the Game" : "Biggest play so far";

  // position helpers for the HTML markers (HTML, not SVG, so dots don't get stretched)
  const leftPct = (i) => (i / last) * 100;
  const topPct = (i) => (1 - frac(plays[i].homeWinPercentage)) * 100;

  return (
    <section>
      <h2 className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-3">Win Probability</h2>
      <div className="card relative overflow-hidden p-4">
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

        {/* odds at the active point (final odds when you're not hovering) */}
        {(() => {
          const h = Math.round(frac(plays[hover ?? last].homeWinPercentage) * 100);
          return (
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TeamLogo src={home?.logo} size={24} className="w-6 h-6" />
                <span className="text-2xl font-extrabold tabular-nums text-white">{h}%</span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">{hover == null ? (homePct === 100 || homePct === 0 ? "Final" : "Now") : "Hovering"}</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold tabular-nums text-white">{100 - h}%</span>
                <TeamLogo src={away?.logo} size={24} className="w-6 h-6" /> <img src={away?.logo} alt="" className="w-6 h-6" />
              </div>
            </div>
          );
        })()}

        {/* chart wrapper: listens for the pointer; touch-pan-y keeps vertical page scrolling working on phones */}
        <div className="relative h-40 touch-pan-y cursor-crosshair select-none" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="absolute inset-0 h-full w-full rounded-md bg-black/30">
            <defs>
              <clipPath id="wp-top">
                <rect x="0" y="0" width="100" height="20" />
              </clipPath>
              <clipPath id="wp-bottom">
                <rect x="0" y="20" width="100" height="20" />
              </clipPath>
            </defs>
            <path d={area} fill={homeColor} fillOpacity="0.6" clipPath="url(#wp-top)" />
            <path d={area} fill={awayColor} fillOpacity="0.6" clipPath="url(#wp-bottom)" />
            <line x1="0" y1="20" x2="100" y2="20" stroke="white" strokeOpacity="0.3" strokeDasharray="4 4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <polyline points={line} fill="none" stroke="white" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>

          {/* Play of the Game marker + label (label is clamped so it never runs off the edges) */}
          {best && (
            <>
              <span
                className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-gold shadow-[0_0_12px_rgba(212,175,55,0.9)]"
                style={{ left: `${leftPct(best.i)}%`, top: `${topPct(best.i)}%` }}
              />
              <span
                className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap rounded-full border border-gold/50 bg-black/80 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-gold"
                style={{ left: `${Math.min(Math.max(leftPct(best.i), 22), 78)}%`, top: topPct(best.i) > 50 ? "4px" : "calc(100% - 22px)" }}>
                ★ {potgLabel}
              </span>
            </>
          )}

          {/* hover guide line + dot */}
          {hover != null && (
            <>
              <span className="pointer-events-none absolute top-0 bottom-0 w-px bg-white/40" style={{ left: `${leftPct(hover)}%` }} />
              <span
                className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black"
                style={{ left: `${leftPct(hover)}%`, top: `${topPct(hover)}%` }}
              />
            </>
          )}
        </div>

        <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-500 mt-1">
          <span>Kickoff</span>
          <span>Now / Final</span>
        </div>

        {/* info panel: the play behind the active point */}
        <div className={`mt-3 rounded-lg border p-3 ${isBest ? "border-gold/40 bg-gold/5" : "border-white/10 bg-white/[0.03]"}`}>
          {activePlay ? (
            <>
              <div className="mb-1 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-gray-500">
                {isBest && <span className="rounded-full bg-gold px-2 py-0.5 font-bold text-black">★ {potgLabel}</span>}
                {/* why this play: turnover, lead change, etc. */}
                {isBest &&
                  best.tags.map((t) => (
                    <span key={t} className="rounded-full border border-gold/40 px-2 py-0.5 text-gold">
                      {t}
                    </span>
                  ))}
                <span>
                  {quarter(activePlay.period?.number)} · {activePlay.clock?.displayValue}
                </span>
                <span>
                  {away?.abbreviation} {activePlay.awayScore} – {activePlay.homeScore} {home?.abbreviation}
                </span>
                {activePlay.scoringPlay && <span className="text-gold">Scoring play</span>}
              </div>
              <p className="text-sm text-gray-200">{activePlay.text}</p>
            </>
          ) : (
            <p className="text-sm text-gray-500">Play details unavailable for this point.</p>
          )}
          {activeDelta != null && (
            <p className="mt-2 font-mono text-xs tabular-nums text-gray-400">
              Swing:{" "}
              <span style={{ color: activeDelta > 0 ? homeColor : awayColor }} className="font-bold">
                {benefited?.abbreviation} {activeDelta > 0 ? "+" : "-"}
                {Math.abs(activeDelta * 100).toFixed(1)} pts
              </span>{" "}
              · {Math.round(frac(plays[from].homeWinPercentage) * 100)}% → {Math.round(frac(plays[to].homeWinPercentage) * 100)}% {home?.abbreviation}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
