"use client";
import useSWR from "swr";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";

const fetcher = (url) => fetch(url).then((res) => res.json());

// reusable leaderboard column — defined outside the page component
function Leaderboard({ title, list, statKey, unit }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-3 text-gray-200">{title}</h2>
      <div className="rounded-lg border border-neutral-700 overflow-hidden">
        {list.map((team, index) => (
          <Link
            key={team.teamId}
            href={`/teams/${team.teamId}`}
            className={`flex items-center justify-between px-3 py-2 text-sm hover:bg-neutral-700 ${
              index % 2 === 0 ? "bg-neutral-900" : "bg-neutral-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-5">{index + 1}</span>
              <img src={team.logo} alt={team.teamName} className="w-6 h-6" />
              <span className="text-gray-200">{team.teamName}</span>
            </div>
            <span className="text-gray-100 font-bold">
              {team.stats?.[statKey]} {unit}
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
  const sortBy = (key) =>
    [...teams].sort((a, b) => (b.stats?.[key] || 0) - (a.stats?.[key] || 0));

  const byPointsPerGame = sortBy("totalPointsPerGame");
  const byPassingYardsPerGame = sortBy("passingYardsPerGame");
  const byRushingYardsPerGame = sortBy("rushingYardsPerGame");
  const byFourthDownPct = sortBy("fourthDownConvPct");
  const bySacks = sortBy("sacks");
  const byInterceptions = sortBy("interceptions");
  const byFumbleRecoveries = sortBy("fumblesRecovered");

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-[#D4AF37] border-b-2 border-[#8B0000] pb-2">
        Team Stats
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Leaderboard
          title="Points Per Game"
          list={byPointsPerGame}
          statKey="totalPointsPerGame"
          unit="pts"
        />
        <Leaderboard
          title="Passing Yards Per Game"
          list={byPassingYardsPerGame}
          statKey="passingYardsPerGame"
          unit="yds"
        />
        <Leaderboard
          title="Rushing Yards Per Game"
          list={byRushingYardsPerGame}
          statKey="rushingYardsPerGame"
          unit="yds"
        />
        <Leaderboard
          title="4th Down Conversion %"
          list={byFourthDownPct}
          statKey="fourthDownConvPct"
          unit="%"
        />
        <Leaderboard title="Sacks" list={bySacks} statKey="sacks" unit="" />
        <Leaderboard
          title="Interceptions"
          list={byInterceptions}
          statKey="interceptions"
          unit=""
        />
        <Leaderboard
          title="Fumble Recoveries"
          list={byFumbleRecoveries}
          statKey="fumblesRecovered"
          unit=""
        />
      </div>
    </main>
  );
}
