"use client";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import Skeleton from "@/components/Skeleton";
import TeamLogo from "@/components/TeamLogo";

const fetcher = (url) => fetch(url).then((res) => res.json());

// one leaderboard: top 10 by default, "Show all" expands to 32. Bars are relative to the #1 team.
function Leaderboard({ title, list, statKey, unit, dec = 0 }) {
  const [all, setAll] = useState(false);
  const val = (t) => t.stats?.[statKey] || 0;
  const max = Math.max(...list.map(val), 1); // longest bar = the leader
  const rows = all ? list : list.slice(0, 10);

  return (
    <div className="card relative overflow-hidden">
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-gray-400">{title}</h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">{unit}</span>
      </div>

      {rows.map((team, index) => (
        <Link key={team.teamId} href={`/teams/${team.teamId}`} className="group relative flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-white/5">
          {/* rank badge: #1 glows gold */}
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold tabular-nums ${
              index === 0 ? "bg-gold text-black shadow-[0_0_12px_rgba(212,175,55,0.6)]" : index < 3 ? "border border-gold/40 text-gold" : "border border-white/10 text-gray-500"
            }`}>
            {index + 1}
          </span>
          <TeamLogo src={team.logo} alt={team.teamName} size={28} className="h-7 w-7 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-gray-200 group-hover:text-white">{team.teamName}</p>
            {/* bar in the team's own color */}
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(val(team) / max) * 100}%`, backgroundColor: `#${team.color || "D4AF37"}` }} />
            </div>
          </div>
          <span className="w-14 text-right font-mono font-bold tabular-nums text-white">{val(team).toFixed(dec)}</span>
        </Link>
      ))}

      <button onClick={() => setAll(!all)} className="w-full cursor-pointer border-t border-white/10 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-gold transition hover:bg-white/5">
        {all ? "Show top 10 ▴" : "Show all 32 ▾"}
      </button>
    </div>
  );
}

export default function TeamStatsPage() {
  const { data, error, isLoading } = useSWR("/api/team-stats", fetcher, { refreshInterval: 3600000 });

  if (error || data?.error) return <p className="p-6">Failed to load team stats.</p>;
  if (isLoading) return <Skeleton variant="grid" count={6} rows={10} />;

  const teams = data.teams || [];
  const sortBy = (key) => [...teams].sort((a, b) => (b.stats?.[key] || 0) - (a.stats?.[key] || 0));

  const boards = [
    { title: "Points Per Game", key: "totalPointsPerGame", unit: "pts", dec: 1 },
    { title: "Passing Yards Per Game", key: "passingYardsPerGame", unit: "yds", dec: 1 },
    { title: "Rushing Yards Per Game", key: "rushingYardsPerGame", unit: "yds", dec: 1 },
    { title: "4th Down Conversion %", key: "fourthDownConvPct", unit: "%", dec: 1 },
    { title: "Sacks", key: "sacks", unit: "total", dec: 0 },
    { title: "Interceptions", key: "interceptions", unit: "total", dec: 0 },
    { title: "Fumble Recoveries", key: "fumblesRecovered", unit: "total", dec: 0 },
  ].map((b) => ({ ...b, list: sortBy(b.key) }));

  // signal tiles: the league leader in four headline stats
  const tiles = [boards[0], boards[1], boards[2], boards[4]].map((b) => ({ label: b.title, team: b.list[0], value: (b.list[0]?.stats?.[b.key] || 0).toFixed(b.dec), unit: b.unit }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* header (same recipe as the Odds Board) */}
      <h1 className="page-title">Team Stats</h1>

      {/* league leaders */}
      <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={`/teams/${t.team?.teamId}`} className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-gold/40">
            <span className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gold/10 blur-2xl" />
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">{t.label}</p>
            <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-white">{t.value}</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
              <TeamLogo src={t.team?.logo} size={16} className="h-4 w-4" />
              <span className="truncate">{t.team?.teamName}</span>
            </div>
          </Link>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {boards.map((b) => (
          <Leaderboard key={b.key} title={b.title} list={b.list} statKey={b.key} unit={b.unit} dec={b.dec} />
        ))}
      </div>
    </div>
  );
}
