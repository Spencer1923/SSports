"use client";
import useSWR from "swr";
import LoadingSpinner from "@/components/LoadingSpinner";
import { TEAM_LOGOS } from "@/lib/divisions";

const fetcher = (url) => fetch(url).then((res) => res.json());

// color-coded pill for injury status
const statusColor = (status = "") => {
  const s = status.toLowerCase();
  if (s.includes("out") || s.includes("reserve")) return "bg-red-900/60 text-red-300";
  if (s.includes("doubtful")) return "bg-orange-900/60 text-orange-300";
  if (s.includes("questionable") || s.includes("day")) return "bg-yellow-900/60 text-yellow-300";
  return "bg-white/10 text-gray-300";
};

export default function InjuriesPage() {
  const { data, error, isLoading } = useSWR("/api/injuries", fetcher, {
    refreshInterval: 3600000, // injuries update slowly, refresh hourly
  });

  if (error) return <p>Failed to load injuries.</p>;
  if (isLoading) return <LoadingSpinner />;

  // data.injuries is a list, one entry per team
  const teams = data.injuries || [];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="page-title">Injury Report</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teams
          .filter((teamEntry) => teamEntry.injuries?.length > 0) // skip teams with no injuries
          .map((teamEntry) => (
            <div key={teamEntry.id} className="card overflow-hidden divide-y divide-white/5">
              <div className="flex items-center gap-2 bg-white/5 px-3 py-2">
                <img src={TEAM_LOGOS[teamEntry.displayName]} alt={teamEntry.displayName} className="w-6 h-6" />
                <h2 className="font-semibold text-gray-200">{teamEntry.displayName}</h2>
                <span className="ml-auto text-xs text-gray-500">{teamEntry.injuries.length} listed</span>
              </div>
              {teamEntry.injuries.map((injury) => (
                <div key={injury.id} className="flex justify-between items-center px-3 py-2 text-sm hover:bg-white/5 transition-colors">
                  <span className="text-gray-200">{injury.athlete?.displayName}</span>
                  <span className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${statusColor(injury.status)}`}>{injury.status}</span>
                    <span className="text-gray-400">{injury.details?.type}</span>
                  </span>
                </div>
              ))}
            </div>
          ))}
      </div>
    </main>
  );
}
