"use client";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import TeamLogo from "@/components/TeamLogo";
import { marketProb } from "@/lib/odds";

const fetcher = (url) => fetch(url).then((res) => res.json());
const pct = (x) => (x >= 0.995 ? "99%+" : x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);

// one cell: the number, with a bar behind it
function Cell({ v }) {
  return (
    <div className="relative w-16 overflow-hidden rounded bg-white/5 px-2 py-1 text-right font-mono text-xs tabular-nums text-white">
      <span className="absolute inset-y-0 left-0 bg-gold/25" style={{ width: `${v * 100}%` }} />
      <span className="relative">{pct(v)}</span>
    </div>
  );
}

export default function PlayoffOdds({ games, meta }) {
  const [open, setOpen] = useState(false); // collapsed by default
  const [result, setResult] = useState(null); // simulation output, stored with the inputs it came from

  // the first 2 weeks that still have unfinished games (these get betting lines)
  const weeks = useMemo(() => [...new Set(games.filter((g) => !g.completed).map((g) => g.week))].sort((a, b) => a - b).slice(0, 2), [games]);

  // a null key tells SWR "don't fetch yet", so nothing loads until the panel is opened
  const a = useSWR(open && weeks[0] ? `/api/betting?week=${weeks[0]}` : null, fetcher);
  const b = useSWR(open && weeks[1] ? `/api/betting?week=${weeks[1]}` : null, fetcher);
  // season-long odds (Super Bowl / conference / division), only fetched when the panel is open
  const f = useSWR(open ? "/api/futures" : null, fetcher);
  const futures = f.data?.teams ?? null; // null if the fetch fails, and the sim just skips the market part
  const waiting = open && (a.isLoading || b.isLoading || f.isLoading); // if a fetch fails we carry on without it

  // { gameId: home win probability } from the market, for games that aren't final
  const market = useMemo(() => {
    const m = {};
    [a.data, b.data].forEach((d) =>
      (d?.games || []).forEach((g) => {
        if (g.state === "post") return;
        const p = marketProb(g.lines?.[0]);
        if (p != null) m[g.id] = p;
      }),
    );
    return m;
  }, [a.data, b.data]);

  // run the simulation in a background thread, only while the panel is open and the lines have loaded
  useEffect(() => {
    if (!open || waiting) return;
    const worker = new Worker(new URL("../lib/monteCarlo.worker.js", import.meta.url));
    worker.onmessage = (e) => setResult({ forGames: games, forMarket: market, data: e.data });
    worker.postMessage({ games, meta, runs: 2000, market, futures });
    return () => worker.terminate();
  }, [open, waiting, games, meta, market, futures]);

  // only use the result if it matches the current inputs; otherwise show the loading state
  const odds = result?.forGames === games && result?.forMarket === market ? result.data : null;
  const lineCount = Object.keys(market).length;

  return (
    <section>
      {/* header: click to expand or collapse */}
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="card flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left hover:bg-white/5 sm:px-4 sm:py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 sm:text-xs sm:tracking-[0.25em]">
          Playoff odds<span className="hidden sm:inline"> · simulated</span>
        </span>
        <span className="hidden flex-1 text-xs text-gray-500 sm:block">{open ? "2,000 simulated seasons" : "Tap to run the simulation"}</span>
        <span className="flex-1 sm:hidden" />
        <span className={`text-gray-500 transition-transform ${open ? "rotate-90" : ""}`}>›</span>
      </button>

      {open && (
        <div className="mt-3">
          {!odds ? (
            <div className="card animate-pulse p-4" aria-busy="true">
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-gray-500">{waiting ? "Loading betting lines…" : "Simulating 2,000 seasons…"}</p>
              <div className="mt-3 h-48 rounded bg-white/5" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {["AFC", "NFC"].map((conf) => {
                  const ids = Object.keys(meta)
                    .filter((id) => meta[id].conference === conf)
                    .sort((x, y) => odds[y].playoff - odds[x].playoff || odds[y].division - odds[x].division);
                  return (
                    <div key={conf} className="card relative overflow-hidden">
                      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
                      <div className="flex items-center justify-between px-4 pb-2 pt-4">
                        <h3 className="text-2xl font-extrabold uppercase tracking-wide text-white">{conf}</h3>
                        <div className="flex gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-gray-500">
                          <span className="w-16 text-right">Playoffs</span>
                          <span className="w-16 text-right">Division</span>
                          <span className="w-16 text-right">Bye</span>
                        </div>
                      </div>
                      {ids.map((id) => (
                        <Link key={id} href={`/teams/${id}`} className="flex items-center gap-3 px-4 py-1.5 text-sm transition-colors hover:bg-white/5">
                          <TeamLogo src={meta[id].logo} size={28} className="h-7 w-7" />
                          <span className="flex-1 font-semibold text-gray-200">{meta[id].abbr}</span>
                          <div className="flex gap-2">
                            <Cell v={odds[id].playoff} />
                            <Cell v={odds[id].division} />
                            <Cell v={odds[id].bye} />
                          </div>
                        </Link>
                      ))}
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] leading-snug text-gray-600">
                {lineCount} near-term games use betting-market win chances; later games use team ratings (sportsbook futures, record, point differential and opponent strength). Later games use team records. Based on real
                results, not your picks.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
