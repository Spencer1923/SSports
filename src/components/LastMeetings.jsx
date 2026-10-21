"use client";
import { useState } from "react";
import useSWR from "swr";

const fetcher = (url) => fetch(url).then((res) => res.json());

// `team` and `opp` are { id, abbreviation }; scores are shown from `team`'s side
export default function LastMeetings({ team, opp }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useSWR(open && team?.id && opp?.id ? `/api/h2h?team=${team.id}&opp=${opp.id}` : null, fetcher);
  const games = data?.games || [];

  // series record over the games found, from `team`'s side
  const wins = games.filter((g) => g.teamWon).length;
  const losses = games.filter((g) => !g.teamWon && !g.tie).length;

  return (
    <section className="mb-10">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="card flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-white/5">
        <span className="font-mono text-xs uppercase tracking-[0.25em] text-gray-400">Last meetings</span>
        <span className="flex-1 text-xs text-gray-500">{open ? `${team?.abbreviation} vs ${opp?.abbreviation}, last 6 seasons` : "Tap to see head-to-head history"}</span>
        <span className={`text-gray-500 transition-transform ${open ? "rotate-90" : ""}`}>›</span>
      </button>

      {open && (
        <div className="card mt-3 overflow-hidden">
          {isLoading && <div className="h-32 animate-pulse bg-white/5" />}
          {!isLoading && games.length === 0 && <p className="p-4 text-sm text-gray-500">No meetings found in the last 6 seasons.</p>}
          {games.length > 0 && (
            <>
              <p className="bg-white/5 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-gray-400">
                {team.abbreviation} is {wins}-{losses}
                {games.length - wins - losses > 0 ? `-${games.length - wins - losses}` : ""} in these games
              </p>
              <div className="divide-y divide-white/5">
                {games.map((g) => (
                  <div key={g.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                    <span className="w-24 shrink-0 text-xs text-gray-500">
                      {g.year} · Wk {g.week}
                    </span>
                    <span className="flex-1 tabular-nums text-gray-300">
                      {team.abbreviation} {g.teamScore} – {g.oppScore} {opp.abbreviation}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${g.tie ? "bg-white/10 text-gray-300" : g.teamWon ? "bg-green-900/50 text-green-300" : "bg-red-900/50 text-red-300"}`}>
                      {g.tie ? "T" : g.teamWon ? "W" : "L"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}