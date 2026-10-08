"use client";
import useSWR from "swr";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";

const fetcher = (url) => fetch(url).then((res) => res.json());

// reusable leaderboard column — defined outside the page component
function Leaderboard({ title, list, statKey, unit }) {
  return (
    <div>
      <h2 className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-3">{title}</h2>
      <div className="card overflow-hidden divide-y divide-white/5">
        {list.map((team, index) => (
          <Link key={team.teamId} href={`/teams/${team.teamId}`} className="flex items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-white/5">
            <div className="flex items-center gap-2">
              <span className={`w-5 tabular-nums ${index < 3 ? "text-gold font-bold" : "text-gray-500"}`}>{index + 1}</span>
              <img src={team.logo} alt={team.teamName} className="w-6 h-6" />
              <span className="text-gray-200">{team.teamName}</span>
            </div>
            <span className="text-gray-100 font-bold tabular-nums">
              {Math.round(team.stats?.[statKey] || 0)} {unit}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function TeamStatsPage() {
  const { data, error, isLoading } = useSWR("/api/team-stats", fetcher, {
    refreshInterval: 3600000,
  });

  if (error) return <p>Failed to load team stats.</p>;
  if (isLoading) return <LoadingSpinner />;

  const teams = data.teams || [];

  // sort copies of the array by each stat, descending — guard against missing stats
  // sort copies of the array by each stat, descending — guard against missing stats
  const sortBy = (key) => [...teams].sort((a, b) => (b.stats?.[key] || 0) - (a.stats?.[key] || 0));

  const byPointsPerGame = sortBy("totalPointsPerGame");
  const byPassingYardsPerGame = sortBy("passingYardsPerGame");
  const byRushingYardsPerGame = sortBy("rushingYardsPerGame");
  const byFourthDownPct = sortBy("fourthDownConvPct");
  const bySacks = sortBy("sacks");
  const byInterceptions = sortBy("interceptions");
  const byFumbleRecoveries = sortBy("fumblesRecovered");

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="page-title">Team Stats</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Leaderboard title="Points Per Game" list={byPointsPerGame} statKey="totalPointsPerGame" unit="pts" />
        <Leaderboard title="Passing Yards Per Game" list={byPassingYardsPerGame} statKey="passingYardsPerGame" unit="yds" />
        <Leaderboard title="Rushing Yards Per Game" list={byRushingYardsPerGame} statKey="rushingYardsPerGame" unit="yds" />
        <Leaderboard title="4th Down Conversion %" list={byFourthDownPct} statKey="fourthDownConvPct" unit="%" />
        <Leaderboard title="Sacks" list={bySacks} statKey="sacks" unit="" />
        <Leaderboard title="Interceptions" list={byInterceptions} statKey="interceptions" unit="" />
        <Leaderboard title="Fumble Recoveries" list={byFumbleRecoveries} statKey="fumblesRecovered" unit="" />
      </div>
    </main>
  );
}
