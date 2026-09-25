"use client";
import useSWR from "swr";
import LoadingSpinner from "@/components/LoadingSpinner";
import { TEAM_LOGOS } from "@/lib/divisions";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function InjuriesPage() {
  const { data, error, isLoading } = useSWR("/api/injuries", fetcher, {
    refreshInterval: 3600000, // injuries update slowly, refresh hourly
  });

  if (error) return <p>Failed to load injuries.</p>;
  if (isLoading) return <LoadingSpinner />;

  // data.injuries is a list, one entry per team
  const teams = data.injuries || [];

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gold border-b-2 border-crimson pb-2">
        Injury Report
      </h1>
      {teams.map((teamEntry) => (
        <div key={teamEntry.id} className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <img
              src={TEAM_LOGOS[teamEntry.displayName]}
              alt={teamEntry.displayName}
              className="w-6 h-6"
            />
            <h2 className="font-semibold">{teamEntry.displayName}</h2>
          </div>
          {teamEntry.injuries?.map((injury) => (
            <p className="text-sm text-gray-400" key={injury.id}>
              {injury.athlete?.displayName} — {injury.status} (
              {injury.details?.type})
            </p>
          ))}
        </div>
      ))}
    </main>
  );
}
