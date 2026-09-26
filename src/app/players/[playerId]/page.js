"use client";
import useSWR from "swr";
import { useParams } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import BackButton from "@/components/BackButton";

// helper: fetches and parses JSON from a URL
const fetcher = (url) => fetch(url).then((res) => res.json());

export default function PlayerPage() {
  const { playerId } = useParams();
  const { data, error, isLoading } = useSWR(
    `/api/players/${playerId}`,
    fetcher,
  );

  if (error) return <p>Failed to load player.</p>;
  if (isLoading) return <LoadingSpinner />;

  const player = data.athlete;
  // season stats are stored under statsSummary.statistics
  const stats = player.statsSummary?.statistics || [];

  return (
    <main className="p-6">
      <BackButton />
      {/* headshot + basic info */}
      <div className="flex items-center gap-4">
        <img
          src={player.headshot?.href}
          alt={player.displayName}
          className="w-24 h-24 rounded object-cover"
        />
        <div>
          <h1 className="text-2xl font-bold mb-6 text-gold border-b-2 border-crimson pb-2">
            {player.displayName}
          </h1>
          <p className="text-gray-300">
            {player.position?.displayName} — #{player.jersey}
          </p>
          <p className="text-gray-300">{player.team?.displayName}</p>
        </div>
      </div>

      {/* bio details */}
      <div className="text-gray-300 mt-4">
        <p>
          Height: {player.displayHeight} | Weight: {player.displayWeight}
        </p>
        <p>
          Age: {player.age} | Experience: {player.displayExperience}
        </p>
        <p>Draft: {player.displayDraft}</p>
      </div>

      {/* season stats table */}
      <section className="mt-6">
        <h2 className="text-xl font-semibold mb-2">
          {player.statsSummary?.displayName || "Season Stats"}
        </h2>
        {stats.map((stat) => (
          <p className="text-gray-300" key={stat.name}>
            {stat.displayName}: {stat.displayValue}
          </p>
        ))}
      </section>
    </main>
  );
}
