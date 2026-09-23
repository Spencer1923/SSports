"use client";
import useSWR from "swr";
import { useParams } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function GamePage() {
  const { gameId } = useParams();
  const { data, error, isLoading } = useSWR(`/api/games/${gameId}`, fetcher);

  if (error) return <p>Failed to load game.</p>;
  if (isLoading) return <LoadingSpinner />;

  // boxscore.teams holds team-level stats (yards, turnovers, etc.)
  const teams = data.boxscore?.teams || [];
  // boxscore.players holds player-level stats grouped by team/category
  const playerStats = data.boxscore?.players || [];

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gold border-b-2 border-crimson pb-2">Box Score</h1>

      {/* team totals side by side */}
      <section className="mb-6">
        {teams.map((teamEntry) => (
          <div key={teamEntry.team.id} className="mb-4">
            <h2 className="font-semibold">{teamEntry.team.displayName}</h2>
            {teamEntry.statistics.map((stat, index) => (
              //combine team id + stat name so keys stay unique across both teams
              <p key={`${teamEntry.team.id}-${stat.name}-${index}`}>
                {stat.label}: {stat.displayValue}
              </p>
            ))}
          </div>
        ))}
      </section>

      {/* player stats, grouped by team then by stat category (passing/rushing/etc.) */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Player Stats</h2>
        {playerStats.map((teamEntry) => (
          <div key={teamEntry.team.id} className="mb-4">
            <h3 className="font-semibold">{teamEntry.team.displayName}</h3>
            {teamEntry.statistics.map((category) => (
              <div key={category.name} className="mb-2">
                <p className="italic">{category.name}</p>
                {category.athletes.map((entry) => (
                  <p key={entry.athlete.id}>
                    {entry.athlete.displayName} — {entry.stats.join(", ")}
                  </p>
                ))}
              </div>
            ))}
          </div>
        ))}
      </section>
    </main>
  );
}
