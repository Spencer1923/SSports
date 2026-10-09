"use client";
import useSWR from "swr";
import { useParams } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import BackButton from "@/components/BackButton";

// helper: fetches and parses JSON from a URL
const fetcher = (url) => fetch(url).then((res) => res.json());

export default function PlayerPage() {
  const { playerId } = useParams();
  const { data, error, isLoading } = useSWR(`/api/players/${playerId}`, fetcher);

  if (error) return <p>Failed to load player.</p>;
  if (isLoading) return <LoadingSpinner />;

  const player = data.athlete;
  // season stats are stored under statsSummary.statistics
  const stats = player.statsSummary?.statistics || [];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <BackButton />
      {/* headshot + basic info */}
      <div className="flex items-center gap-4">
        <img src={player.headshot?.href} alt={player.displayName} className="w-28 h-28 rounded-full object-cover object-top ring-2 ring-gold/60 bg-white/5" />
        <div>
          <h1 className="text-3xl font-extrabold uppercase tracking-wide text-white mb-1">{player.displayName}</h1>
          <p className="text-gray-300">
            {player.position?.displayName} — #{player.jersey}
          </p>
          <p className="text-gray-300">{player.team?.displayName}</p>
        </div>
      </div>

      {/* bio details */}
      <div className="card grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 p-4 mt-6 text-sm">
        {[
          ["Height", player.displayHeight],
          ["Weight", player.displayWeight],
          ["Age", player.age],
          ["Experience", player.displayExperience],
          ["Draft", player.displayDraft],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-[11px] uppercase tracking-widest text-gray-500">{label}</p>
            <p className="text-gray-100">{value}</p>
          </div>
        ))}
      </div>

      {/* season stats table */}
      <section className="mt-8">
        <h2 className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-3">{player.statsSummary?.displayName || "Season Stats"}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <div key={stat.name} className="card p-4 text-center">
              <p className="text-3xl font-extrabold tabular-nums text-white">{stat.displayValue}</p>
              <p className="text-[11px] uppercase tracking-widest text-gray-400 mt-1">{stat.displayName}</p>
              {/* league rank, e.g. "4th" */}
              {stat.rankDisplayValue && <p className="text-xs text-gold mt-1">{stat.rankDisplayValue}</p>}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
