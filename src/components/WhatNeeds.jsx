"use client";
import { useMemo, useState } from "react";
import TeamLogo from "@/components/TeamLogo";
import { whatNeeds } from "@/lib/whatNeeds";

const GOALS = [
  ["playoff", "Make playoffs"],
  ["division", "Win division"],
  ["bye", "#1 seed"],
];

export default function WhatNeeds({ games, meta }) {
  const [open, setOpen] = useState(false); // collapsed by default
  const [teamId, setTeamId] = useState("");
  const [goal, setGoal] = useState("playoff");

  // all 32 teams, A to Z
  const teams = useMemo(() => Object.values(meta).sort((a, b) => a.name.localeCompare(b.name)), [meta]);

  // only runs while the panel is open and a team is chosen
  const result = useMemo(() => (open && teamId ? whatNeeds(games, meta, teamId, goal) : null), [open, teamId, goal, games, meta]);

  // group the needed results by week
  const byWeek = {};
  (result?.games || []).forEach((g) => (byWeek[g.week] = [...(byWeek[g.week] || []), g]));

  const ownCount = (result?.games || []).filter((g) => g.own).length;
  const helpCount = (result?.games || []).length - ownCount;

  return (
    <section>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="card flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left hover:bg-white/5 sm:px-4 sm:py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 sm:text-xs sm:tracking-[0.25em]">What needs to happen</span>
        <span className="hidden flex-1 text-xs text-gray-500 sm:block">{open ? "Pick a team and a goal" : "Tap to see what a team needs"}</span>
        <span className="flex-1 sm:hidden" />
        <span className={`text-gray-500 transition-transform ${open ? "rotate-90" : ""}`}>›</span>
      </button>

      {open && (
        <div className="card mt-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="rounded-full border border-white/10 bg-black px-4 py-2 text-base text-gray-200 sm:text-sm">
              <option value="">Choose a team…</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {GOALS.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setGoal(key)}
                className={`cursor-pointer rounded-full px-4 py-1.5 text-xs uppercase tracking-widest transition ${goal === key ? "bg-gold font-bold text-black" : "border border-white/10 text-gray-400 hover:text-white"}`}>
                {label}
              </button>
            ))}
          </div>

          {result?.status === "impossible" && <p className="mt-4 text-sm text-red-400">Not possible: even if every result went their way, they can&apos;t reach this goal.</p>}
          {result?.status === "clinched" && <p className="mt-4 text-sm text-green-400">Already locked in, even if every result went against them.</p>}

          {result?.status === "needs" && (
            <div className="mt-4">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-gray-500">
                {ownCount} own {ownCount === 1 ? "win" : "wins"} · {helpCount} {helpCount === 1 ? "result" : "results"} elsewhere
              </p>
              {Object.entries(byWeek).map(([week, list]) => (
                <div key={week} className="mb-3">
                  <p className="mb-1 text-xs font-bold text-gold">Week {week}</p>
                  <div className="divide-y divide-white/5 rounded-lg border border-white/10">
                    {list.map((g) => (
                      <div key={g.id} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300">
                        <TeamLogo src={meta[g.winnerId].logo} size={24} className="h-6 w-6" />
                        <span className="font-semibold text-white">{meta[g.winnerId].abbr}</span>
                        <span className="text-gray-500">beats</span>
                        <TeamLogo src={meta[g.loserId].logo} size={24} className="h-6 w-6 opacity-60" />
                        <span>{meta[g.loserId].abbr}</span>
                        <span className={`ml-auto rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${g.own ? "bg-gold/15 text-gold" : "bg-white/10 text-gray-400"}`}>
                          {g.own ? "Win" : "Needs help"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-[11px] leading-snug text-gray-600">
                Approximate: this assumes every other game goes against the team. It&apos;s a set that can&apos;t be shortened, not always the shortest possible one.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
