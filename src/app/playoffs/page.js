"use client";
import useSWR from "swr";
import { useState, useMemo } from "react";
import Skeleton from "@/components/Skeleton";
import { buildMeta, computeSeeds, addMovement } from "@/lib/playoffs";
import { computeSOS } from "@/lib/ratings";
import TeamLogo from "@/components/TeamLogo";
import Link from "next/link";
import PlayoffOdds from "@/components/PlayoffOdds";
import WhatNeeds from "@/components/WhatNeeds";

const fetcher = (url) => fetch(url).then((res) => res.json());

// arrow showing how far a team moved vs the baseline (no picks)
function Move({ n }) {
  if (!n) return <span className="text-gray-700">–</span>;
  return <span className={n > 0 ? "text-green-400" : "text-red-400"}>{n > 0 ? `▲${n}` : `▼${-n}`}</span>;
}

// strength of schedule: average opponent rating over the whole season, colored by rank (1 = hardest of 32)
function Sos({ info, rank }) {
  if (!info || !rank) return <span className="font-mono text-[10px] text-gray-700">–</span>;
  const tone = rank <= 8 ? "bg-red-500" : rank >= 25 ? "bg-green-500" : "bg-gold/70";
  const text = rank <= 8 ? "text-red-400" : rank >= 25 ? "text-green-400" : "text-gray-400";
  return (
    <div className="flex items-center gap-2" title={`Average opponent rating: ${info.sos.toFixed(3)} · hardest-schedule rank #${rank} of 32 · ${info.games} games played`}>
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
        {/* same column widths as the rows below, so the labels sit over their values */}
        <div className="flex gap-3 font-mono text-[10px] uppercase tracking-[0.1em] text-gray-500">
          <span className="w-14 text-right">Rec</span>
          {/* SOS column = number (w-9), plus the bar (w-12 + gap-2) on wider screens */}
          <span className="w-9 text-right sm:w-[5.75rem]">SOS</span>
          <span className="w-8 text-right">Move</span>
        </div>
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

  // season-long SOS from team ratings; it uses real results + futures odds, so picks don't change it
  const { data: futures } = useSWR("/api/futures", fetcher);
  const sos = useMemo(() => (meta ? computeSOS(data.games, meta, futures?.teams) : null), [data, meta, futures]);

  if (error || data?.error) return <p>Failed to load playoff picture.</p>;
  if (isLoading || !current) return <Skeleton variant="grid" hero count={2} rows={16} />;

  const open = data.games.filter((g) => !g.completed);
  const weeks = [...new Set(open.map((g) => g.week))].sort((a, b) => a - b);
  const activeWeek = week ?? weeks[0];
  const weekGames = open.filter((g) => g.week === activeWeek);
  const pickedCount = Object.keys(picks).length;

  // rank all 32 teams by remaining SOS: rank 1 = hardest schedule
  const byHardest = Object.keys(sos)
    .filter((id) => sos[id].games > 0) // skip teams with no games played yet
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
    hardest && { label: "Toughest schedule so far", value: sos[hardest].sos.toFixed(3), sub: `${meta[hardest].abbr} · ${sos[hardest].games} played`, logo: meta[hardest].logo },
    easiest && { label: "Easiest schedule so far", value: sos[easiest].sos.toFixed(3), sub: `${meta[easiest].abbr} · ${sos[easiest].games} played`, logo: meta[easiest].logo },
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
        className="relative mb-4 overflow-hidden rounded-2xl border border-white/10 p-4 sm:mb-8 sm:p-8"
        style={{
          background: "radial-gradient(260px 110px at 0% -15%, rgba(212,175,55,0.4), transparent 70%), radial-gradient(280px 120px at 100% 120%, rgba(190,15,25,0.5), transparent 70%), #08080a",
        }}>
        <div
          className="pointer-events-none absolute inset-0 hidden sm:block"
          style={{ background: "radial-gradient(620px 260px at 0% -20%, rgba(212,175,55,0.45), transparent 70%), radial-gradient(700px 320px at 100% 125%, rgba(190,15,25,0.55), transparent 70%)" }}
        />
        {/* faint grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "radial-gradient(white 1.3px, transparent 1.7px)",
            backgroundSize: "14px 14px",
            maskImage: "linear-gradient(90deg, black, transparent 75%)",
            WebkitMaskImage: "linear-gradient(90deg, black, transparent 75%)",
          }}
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-gold/80 sm:text-[11px] sm:tracking-[0.35em]">
              Scenario lab · {open.length} games left<span className="hidden sm:inline"> · {pickedCount} picks</span>s
            </p>
            <h1 className="mt-1 text-2xl font-extrabold uppercase tracking-wide text-white sm:mt-2 sm:text-5xl">
              <span className="sm:hidden">Playoff Sim</span>
              <span className="hidden sm:inline">Playoff Simulator</span>
            </h1>
            <p className="mt-1 truncate text-xs text-gray-400 sm:mt-2 sm:max-w-xl sm:whitespace-normal sm:text-sm">
              <span className="sm:hidden">Pick winners, watch seeds change.</span>
              <span className="hidden sm:inline">Pick any remaining game and watch both conferences reseed, with tiebreakers and remaining strength of schedule.</span>
            </p>
          </div>
          <button
            onClick={() => setPicks({})}
            disabled={!pickedCount}
            className="cursor-pointer rounded-full border border-white/15 px-3 py-1 text-xs text-gray-300 sm:px-4 sm:py-1.5 sm:text-sm transition hover:border-crimson hover:text-white disabled:cursor-default disabled:opacity-30">
            Reset picks
          </button>
        </div>
      </header>
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-gold/80 via-gold/20 to-transparent" />

      {/* signal tiles */}
      <section className="mb-4 grid grid-cols-3 gap-2 sm:mb-8 sm:gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-2 sm:p-4">
            <span className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gold/10 blur-2xl" />
            <p className="truncate font-mono text-[8px] uppercase tracking-[0.08em] text-gray-500 sm:text-[10px] sm:tracking-[0.25em]">{t.label}</p>
            <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-white sm:mt-2 sm:text-3xl">{t.value}</p>
            <div className="mt-0.5 flex items-center gap-1 text-[9px] text-gray-400 sm:mt-2 sm:gap-1.5 sm:text-xs">
              {t.logo && <TeamLogo src={t.logo} size={16} className="h-3 w-3 sm:h-4 sm:w-4" />}
              <span className="truncate">{t.sub}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Monte Carlo odds: simulated from the real results so far (ignores your picks) */}

      {/* both conferences */}
      <div className="mb-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SeedTable title="AFC" rows={current.AFC} meta={meta} sos={sos} sosRank={sosRank} />
        <SeedTable title="NFC" rows={current.NFC} meta={meta} sos={sos} sosRank={sosRank} />
      </div>
      <p className="-mt-6 mb-8 text-center font-mono text-[10px] text-gray-600">
        SOS = average strength of every opponent on a team&apos;s schedule (played and remaining), with road games counted as harder. Red = among the 8 hardest, green = among the 8 easiest.
      </p>

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
      <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2 xl:grid-cols-3">
        {weekGames.map((g) => (
          <div key={g.id} className="card relative overflow-hidden p-2 sm:p-3">
            <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
            <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.15em] text-gray-600 sm:mb-2 sm:text-[10px] sm:tracking-[0.2em]">
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
                    className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 py-1 transition sm:gap-2 sm:py-2.5 ${
                      chosen
                        ? "border-gold bg-gold/10 shadow-[0_0_14px_rgba(212,175,55,0.25)]"
                        : picks[g.id]
                          ? "border-white/10 opacity-40 hover:opacity-100"
                          : "border-white/10 bg-white/5 hover:border-white/40 hover:bg-white/10"
                    }`}>
                    <TeamLogo src={meta[id].logo} alt={meta[id].name} size={28} className="h-5 w-5 sm:h-7 sm:w-7" />
                    <span className="font-mono text-xs font-bold text-white sm:text-sm">{meta[id].abbr}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* the two collapsible panels sit under the pick simulator */}
      <div className="mt-10 space-y-4">
        <PlayoffOdds games={data.games} meta={meta} />
        <WhatNeeds games={data.games} meta={meta} />
      </div>
    </div>
  );
}
