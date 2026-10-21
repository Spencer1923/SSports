"use client";
import useSWR from "swr";
import { TEAM_LOGOS } from "@/lib/divisions";
import { useState } from "react";
import TeamLogo from "@/components/TeamLogo";
import Skeleton from "@/components/Skeleton";
import Link from "next/link";

const fetcher = (url) => fetch(url).then((res) => res.json());

// color-coded pill for injury status
const statusColor = (status = "") => {
  const s = status.toLowerCase();
  if (s.includes("out") || s.includes("reserve")) return "bg-red-900/60 text-red-300";
  if (s.includes("doubtful")) return "bg-orange-900/60 text-orange-300";
  if (s.includes("questionable") || s.includes("day")) return "bg-yellow-900/60 text-yellow-300";
  return "bg-white/10 text-gray-300";
};
// pulls the player id out of ESPN's player card link, e.g. ".../player/_/id/5099542/name" -> "5099542"
const playerId = (athlete) => athlete?.id || athlete?.links?.[0]?.href?.match(/\/id\/(\d+)/)?.[1];
export default function InjuriesPage() {
  const { data, error, isLoading } = useSWR("/api/injuries", fetcher, {
    refreshInterval: 3600000, // injuries update slowly, refresh hourly
  });
  const [query, setQuery] = useState(""); // search text
  const [selected, setSelected] = useState(null); // team picked from the logo strip
  if (error) return <p>Failed to load injuries.</p>;
  if (isLoading) return <Skeleton variant="rows" count={8} />;

  // data.injuries is a list, one entry per team
  const teams = data.injuries || [];
  const withInjuries = teams.filter((t) => t.injuries?.length > 0);
  const q = query.trim().toLowerCase();

  // apply the logo pick and the search text (matches team name or any injured player's name)
  const shown = withInjuries.filter((t) => {
    if (selected && t.id !== selected) return false;
    if (!q) return true;
    return t.displayName.toLowerCase().includes(q) || t.injuries.some((i) => i.athlete?.displayName?.toLowerCase().includes(q));
  });

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="page-title">Injury Report</h1>
      {/* search + one logo per team: click a logo to show only that team, click again to show all */}
      <div className="mb-6 space-y-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a team or player..."
          className="w-full sm:w-80 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-base sm:text-sm text-gray-200 placeholder-gray-500 focus:border-gold/60"
        />
        <div className="flex flex-wrap gap-2">
          {withInjuries.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(selected === t.id ? null : t.id)}
              title={t.displayName}
              className={`rounded-lg border p-1.5 cursor-pointer transition ${
                selected === t.id ? "border-gold bg-gold/10" : selected ? "border-white/10 opacity-40 hover:opacity-100" : "border-white/10 hover:border-white/30"
              }`}>
              <TeamLogo src={TEAM_LOGOS[t.displayName]} alt={t.displayName} size={28} className="w-7 h-7" />
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 && <p className="text-sm text-gray-500">No injuries match your search.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shown.map((teamEntry) => (
          <div key={teamEntry.id} className="card overflow-hidden divide-y divide-white/5">
            <div className="flex items-center gap-2 bg-white/5 px-3 py-2">
              <TeamLogo src={TEAM_LOGOS[teamEntry.displayName]} alt={teamEntry.displayName} size={24} className="w-6 h-6" />
              <Link href={`/teams/${teamEntry.id}`} className="font-semibold text-gray-200 hover:text-gold">
                {teamEntry.displayName}
                {teamEntry.displayName}
              </Link>
              <span className="ml-auto text-xs text-gray-500">{teamEntry.injuries.length} listed</span>
            </div>
            {teamEntry.injuries.map((injury) => (
              <div key={injury.id} className="flex justify-between items-center px-3 py-2 text-sm hover:bg-white/5 transition-colors">
                <Link href={`/players/${playerId(injury.athlete)}`} className="text-gray-200 hover:text-gold">
                  {injury.athlete?.displayName}
                </Link>
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
