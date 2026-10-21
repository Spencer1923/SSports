"use client";
import useSWR from "swr";
import { useState, useMemo } from "react";
import Skeleton from "@/components/Skeleton";
import { buildMeta, computeSeeds, addMovement, computeRemainingSOS } from "@/lib/playoffs";
import TeamLogo from "@/components/TeamLogo";
import Link from "next/link";
import PlayoffOdds from "@/components/PlayoffOdds";
import WhatNeeds from "@/components/WhatNeeds";
import SosTrend from "@/components/SosTrend";

const fetcher = (url) => fetch(url).then((res) => res.json());

// arrow showing how far a team moved vs the baseline (no picks)
function Move({ n }) {
  if (!n) return <span className="text-gray-700">–</span>;
  return <span className={n > 0 ? "text-green-400" : "text-red-400"}>{n > 0 ? `▲${n}` : `▼${-n}`}</span>;
}

// remaining strength of schedule: a small bar + the number, colored by rank (1 = hardest of 32)
function Sos({ info, rank }) {
  if (!info || !info.left) return <span className="font-mono text-[10px] text-gray-700">done</span>;
  const tone = rank <= 8 ? "bg-red-500" : rank >= 25 ? "bg-green-500" : "bg-gold/70";
  const text = rank <= 8 ? "text-red-400" : rank >= 25 ? "text-green-400" : "text-gray-400";
  return (
    <div className="flex items-center gap-2" title={`Remaining opponents' win %: ${info.sos.toFixed(3)} · hardest-schedule rank #${rank} of 32 · ${info.left} games left`}>
      <div className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-white/10 sm:block">
        <div className={`h-full ${tone}`} style={{ width: `${Math.round(info.sos * 100)}%` }} />
      </div>
      <span className={`w-9 text-right font-mono text-[11px] tabular-nums ${text}`}>{info.sos.toFixed(3).replace(/^0/, "")}</span>
    </div>
  );
}

// one conference's seed table (all 16 teams, with a glowing cut line after seed 7)
function SeedTable({ title, rows, meta, sos, sosRank }) {
  return (
    <div className="card relative overflow-hidden">
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="text-2xl font-extrabold uppercase tracking-wide text-white">{title}</h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">Rec · SOS · Move</span>
      </div>
      {rows.map((t) => (
        <div key={t.id}>
          <Link href={`/teams/${t.id}`} className={`flex items-center gap-3 px-4 py-1.5 text-sm transition-colors hover:bg-white/5 ${t.inPlayoffs ? "text-gray-200" : "text-gray-600"}`}>
            {/* seed badge: seed 1 (the bye) glows gold */}
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-md font-mono text-xs font-bold tabular-nums ${
                t.seed === 1 ? "bg-gold text-black shadow-[0_0_12px_rgba(212,175,55,0.6)]" : t.inPlayoffs ? "border border-white/20 bg-white/5" : "border border-white/5"
              }`}>
              {t.seed}
            </span>
            <TeamLogo src={meta[t.id].logo} alt={meta[t.id].name} size={28} className={`h-7 w-7 ${t.inPlayoffs ? "" : "opacity-40"}`} />
            <span className="flex-1 font-semibold">
              {meta[t.id].abbr}
              {t.divWinner && <span className="ml-2 rounded-full border border-gold/40 bg-gold/10 px-1.5 py-0.5 font-mono text-[9px] text-gold">DIV</span>}
            </span>
            <span className="w-14 text-right font-mono tabular-nums text-gray-400">{t.t ? `${t.w}-${t.l}-${t.t}` : `${t.w}-${t.l}`}</span>
            <Sos info={sos[t.id]} rank={sosRank[t.id]} />
            <span className="w-8 text-right font-mono text-xs">
              <Move n={t.move} />
            </span>
          </Link>
          {/* playoff line under seed 7 */}
          {t.seed === 7 && (
            <div className="relative my-1 h-px bg-gradient-to-r from-transparent via-gold to-transparent">
              <span className="absolute left-1/2 -top-2 -translate-x-1/2 bg-[#0b0b0b] px-2 font-mono text-[9px] uppercase tracking-[0.3em] text-gold">Playoff line</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function PlayoffsPage() {
  const { data, error, isLoading } = useSWR("/api/playoff-picture", fetcher, { refreshInterval: 300000 });
  const [picks, setPicks] = useState({}); // { gameId: "home" | "away" }
  const [week, setWeek] = useState(null); // selected week tab (null = first week with open games)

  const meta = useMemo(() => (data?.teams ? buildMeta(data.teams) : null), [data]);
  const baseline = useMemo(() => (meta ? computeSeeds(data.games, {}, meta) : null), [data, meta]);
  const current = useMemo(() => (meta ? addMovement(computeSeeds(data.games, picks, meta), baseline) : null), [data, meta, baseline, picks]);
  // remaining strength of schedule, recomputed whenever picks change
  const sos = useMemo(() => (meta ? computeRemainingSOS(data.games, picks, meta) : null), [data, meta, picks]);

  if (error || data?.error) return <p>Failed to load playoff picture.</p>;
  if (isLoading || !current) return <Skeleton variant="grid" hero count={2} rows={16} />;

  const open = data.games.filter((g) => !g.completed);
  const weeks = [...new Set(open.map((g) => g.week))].sort((a, b) => a - b);
  const activeWeek = week ?? weeks[0];
  const weekGames = open.filter((g) => g.week === activeWeek);
  const pickedCount = Object.keys(picks).length;

  // rank all 32 teams by remaining SOS: rank 1 = hardest schedule
  const byHardest = Object.keys(sos)
    .filter((id) => sos[id].left > 0)
    .sort((a, b) => sos[b].sos - sos[a].sos);
  const sosRank = {};
  byHardest.forEach((id, i) => (sosRank[id] = i + 1));

  // biggest seed mover across both conferences (only exists once you've made picks)
  const allRows = [...current.AFC, ...current.NFC];
  const mover = allRows.reduce((b, t) => (Math.abs(t.move) > Math.abs(b?.move ?? 0) ? t : b), null);

  // signal tiles, same look as the Odds Board
  const hardest = byHardest[0];
  const easiest = byHardest[byHardest.length - 1];
  const tiles = [
    hardest && { label: "Toughest schedule left", value: sos[hardest].sos.toFixed(3), sub: `${meta[hardest].abbr} · ${sos[hardest].left} games`, logo: meta[hardest].logo },
    easiest && { label: "Easiest schedule left", value: sos[easiest].sos.toFixed(3), sub: `${meta[easiest].abbr} · ${sos[easiest].left} games`, logo: meta[easiest].logo },
    {
      label: "Biggest seed mover",
      value: mover && mover.move ? (mover.move > 0 ? `▲${mover.move}` : `▼${-mover.move}`) : "—",
      sub: mover && mover.move ? meta[mover.id].abbr : "Make a pick",
      logo: mover && mover.move ? meta[mover.id].logo : null,
    },
  ].filter(Boolean);

  // click a team to pick it; click again to clear
  const toggle = (gameId, side) => setPicks((p) => (p[gameId] === side ? Object.fromEntries(Object.entries(p).filter(([k]) => k !== gameId)) : { ...p, [gameId]: side }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* mission-control header (same recipe as the Odds Board) */}
      <header
        className="relative mb-8 overflow-hidden rounded-2xl border border-white/10 p-6 sm:p-8"
        style={{ background: "radial-gradient(1000px 300px at 15% -30%, rgba(212,175,55,0.2), transparent), radial-gradient(700px 300px at 100% 130%, rgba(139,0,0,0.3), transparent), #0b0b0b" }}>
        {/* faint grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)", backgroundSize: "32px 32px" }}
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-gold/80">
              Scenario lab · {open.length} games left · {pickedCount} picks
            </p>
            <h1 className="mt-2 text-4xl font-extrabold uppercase tracking-wide text-white sm:text-5xl">Playoff Simulator</h1>
            <p className="mt-2 max-w-xl text-sm text-gray-400">Pick any remaining game and watch both conferences reseed, with tiebreakers and remaining strength of schedule.</p>
          </div>
          <button
            onClick={() => setPicks({})}
            disabled={!pickedCount}
            className="cursor-pointer rounded-full border border-white/15 px-4 py-1.5 text-sm text-gray-300 transition hover:border-crimson hover:text-white disabled:cursor-default disabled:opacity-30">
            Reset picks
          </button>
        </div>
      </header>

      {/* signal tiles */}
      <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <span className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gold/10 blur-2xl" />
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-500">{t.label}</p>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-white">{t.value}</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
              {t.logo && <TeamLogo src={t.logo} size={16} className="h-4 w-4" />}
              <span>{t.sub}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Monte Carlo odds: simulated from the real results so far (ignores your picks) */}
      <div className="mb-4">
        <PlayoffOdds games={data.games} meta={meta} />
      </div>
      <div className="mb-4">
        <WhatNeeds games={data.games} meta={meta} />
      </div>
      <div className="mb-10">
        <SosTrend games={data.games} meta={meta} />
      </div>

      {/* both conferences */}
      <div className="mb-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SeedTable title="AFC" rows={current.AFC} meta={meta} sos={sos} sosRank={sosRank} />
        <SeedTable title="NFC" rows={current.NFC} meta={meta} sos={sos} sosRank={sosRank} />
      </div>
      <p className="-mt-6 mb-8 text-center font-mono text-[10px] text-gray-600">SOS = combined win % of a team&apos;s remaining opponents. Red = among the 8 hardest, green = among the 8 easiest.</p>

      {/* week tabs */}
      <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-gray-400">Pick the winners</h2>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {weeks.map((w) => {
          const n = open.filter((g) => g.week === w && picks[g.id]).length;
          return (
            <button
              key={w}
              onClick={() => setWeek(w)}
              className={`cursor-pointer rounded-full px-4 py-1 text-xs uppercase tracking-widest transition ${activeWeek === w ? "bg-gold font-bold text-black" : "border border-white/10 text-gray-400 hover:text-white"}`}>
              Wk {w}
              {n > 0 && <span className="ml-1 font-bold">·{n}</span>}
            </button>
          );
        })}
      </div>

      {/* game cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {weekGames.map((g) => (
          <div key={g.id} className="card relative overflow-hidden p-3">
            <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">
              {meta[g.awayId].abbr} @ {meta[g.homeId].abbr}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { side: "away", id: g.awayId },
                { side: "home", id: g.homeId },
              ].map(({ side, id }) => {
                const chosen = picks[g.id] === side;
                return (
                  <button
                    key={side}
                    onClick={() => toggle(g.id, side)}
                    aria-pressed={chosen}
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-2 py-2.5 transition ${
                      chosen
                        ? "border-gold bg-gold/10 shadow-[0_0_14px_rgba(212,175,55,0.25)]"
                        : picks[g.id]
                          ? "border-white/10 opacity-40 hover:opacity-100"
                          : "border-white/10 bg-white/5 hover:border-white/40 hover:bg-white/10"
                    }`}>
                    <TeamLogo src={meta[id].logo} alt={meta[id].name} size={28} className="h-7 w-7" />
                    <span className="font-mono text-sm font-bold text-white">{meta[id].abbr}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
