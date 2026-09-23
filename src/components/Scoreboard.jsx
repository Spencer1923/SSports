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
      {data.events.map((game) => (
        <Link key={game.id} href={`/games/${game.id}`} className="border border-crimson rounded p-3 bg-neutral-900 hover:bg-neutral-800 hover:shadow-[0_0_10px_#8B0000]">
          <p className="font-bold">{game.name}</p>
          <p>{game.status.type.detail}</p>
          {game.competitions[0].competitors.map((team) => (
            <p key={team.id}>
              {team.team.displayName}: {team.score}
            </p>
          ))}
        </Link>
      ))}
    </div>
  );
}