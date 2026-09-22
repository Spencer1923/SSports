"use client";
import useSWR from "swr";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function Scoreboard() {
  const { data, error, isLoading } = useSWR("/api/scores", fetcher, {
    refreshInterval: 30000, // refresh every 30s
  });

  if (error) return <p>Failed to load scores.</p>;
  if (isLoading) return <p>Loading scores...</p>;

  return (
    <div className="grid gap-3">
      {data.events.map((game) => (
        <div key={game.id} className="border rounded p-3">
          <p className="font-bold">{game.name}</p>
          <p>{game.status.type.detail}</p>
          {game.competitions[0].competitors.map((team) => (
            <p key={team.id}>
              {team.team.displayName}: {team.score}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}