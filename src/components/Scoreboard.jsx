"use client";
import useSWR from "swr";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function Scoreboard() {
  const { data, error, isLoading } = useSWR("/api/scores", fetcher, {
    refreshInterval: 30000, // refresh every 30s
  });

  if (error) return <p>Failed to load scores.</p>;
  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="grid gap-3">
      {data.events.map((game) => {
        // ESPN lists competitors as [home, away] or [away, home] depending on game — sort by homeAway field
        const competitors = game.competitions[0].competitors;
        const home = competitors.find((c) => c.homeAway === "home");
        const away = competitors.find((c) => c.homeAway === "away");

        return (
          <Link
            key={game.id}
            href={`/games/${game.id}`}
            className="group block border border-gray-700 rounded-lg p-3 bg-gray-950 hover:bg-gray-800 transition-colors hover:border-crimson"
          >
            {/* game status at top, small and subtle */}
            <p className="text-xs text-gray-400 mb-2">
              {game.status.type.detail}
            </p>

            {/* away team row */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <img
                  src={away.team.logo}
                  alt={away.team.displayName}
                  className="w-6 h-6"
                />
                <span className="text-gray-200 text-sm group-hover:text-gold">
                  {away.team.shortDisplayName}
                </span>
              </div>
              {game.status.type.state !== "pre" && (
                <span className="font-bold text-gray-100 group-hover:text-gold">
                  {away.score}
                </span>
              )}
            </div>

            {/* home team row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src={home.team.logo}
                  alt={home.team.displayName}
                  className="w-6 h-6"
                />
                <span className="text-gray-200 text-sm group-hover:text-gold">
                  {home.team.shortDisplayName}
                </span>
              </div>
              {game.status.type.state !== "pre" && (
                <span className="font-bold text-gray-100 group-hover:text-gold">
                  {home.score}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
