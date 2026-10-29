"use client";
import { useState } from "react";
import useSWR from "swr";
import GameLog from "@/components/GameLog";

const fetcher = (url) => fetch(url).then((res) => res.json());

// nicer titles for groups ESPN names in lowercase (kickers)
const GROUP_NAMES = { fieldgoals: "Field goals", pats: "Extra points" };
// positions that don't get the Fumbles and Interceptions rows (abbreviations as ESPN spells them)
const HIDE_SMALL_GROUPS = ["DE", "DT", "NT", "DL", "EDGE", "LB", "OLB", "ILB", "MLB"];

// receivers and tight ends already show these season stats above, so they only get the game log
const SKIP_SEASON_STATS = ["WR", "TE"];

export default function MoreStats({ playerId, position }) {
  const [open, setOpen] = useState(false); // collapsed by default

  // a null key tells SWR "don't fetch yet", so nothing loads until the panel is opened
  const skipSeason = SKIP_SEASON_STATS.includes(position);
  // WR/TE don't need the season splits, so we don't fetch them
  const { data, error, isLoading } = useSWR(open && !skipSeason ? `/api/players/${playerId}/splits` : null, fetcher);

  // cut the one long row of values into groups, using each category's count.
  // e.g. count 10 -> first 10 labels/values are "Passing", next 5 are "Rushing"
  // punters have no categories, so treat the whole row as one group
  const cats = data?.labels ? (data.categories?.length ? data.categories : [{ name: "Season", count: data.labels.length }]) : [];
  const groups = cats.map((c, i) => {
    const from = cats.slice(0, i).reduce((sum, x) => sum + x.count, 0); // columns used by earlier groups
    return {
      name: GROUP_NAMES[c.name] || c.name,
      labels: data.labels.slice(from, from + c.count),
      values: data.stats.slice(from, from + c.count),
      titles: (data.fullNames || []).slice(from, from + c.count), // full stat names, shown on hover
    };
  });

  // edge rushers, linebackers and DTs: drop the Fumbles and Interceptions rows
  const hideSmall = HIDE_SMALL_GROUPS.includes(position);
  const shown = groups.filter((g) => !(hideSmall && ["fumbles", "interceptions"].includes(g.name.toLowerCase())));

  return (
    <section className="mt-6">
      {/* header: click to expand or collapse */}
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="card flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left hover:bg-white/5 sm:px-4 sm:py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 sm:text-xs sm:tracking-[0.25em]">More stats</span>
        <span className="flex-1" />
        <span className={`text-gray-500 transition-transform ${open ? "rotate-90" : ""}`}>›</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {!skipSeason && isLoading && <div className="card h-24 animate-pulse bg-white/5" />}
          {!skipSeason && (error || data?.error) && <p className="text-sm text-gray-500">Couldn&apos;t load more stats.</p>}
          {!skipSeason && data && !data.error && shown.length === 0 && <p className="text-sm text-gray-500">No extra stats available for this player.</p>}

          {shown.map((g) => (
            <div key={g.name} className="card p-3 sm:p-4">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500 sm:text-[11px]">{g.name}</p>
              {/* each stat: small label on top, value underneath */}
              <div className="flex flex-wrap gap-x-4 gap-y-3 sm:gap-x-6">
                {g.labels.map((label, i) => (
                  <div key={i} title={g.titles[i]} className="min-w-[2.5rem] text-center">
                    <p className="text-[10px] uppercase tracking-widest text-gray-500">{label}</p>
                    <p className="text-sm font-bold tabular-nums text-white sm:text-lg">{g.values[i]}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {/* tabs to leave out of the game log: LB/DL lose Fumbles + Interceptions, WR/TE lose Fumbles */}
          <GameLog playerId={playerId} hideTabs={hideSmall ? ["fumbles", "interceptions"] : skipSeason ? ["fumbles"] : []} />
        </div>
      )}
    </section>
  );
}
