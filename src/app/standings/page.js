"use client";
import useSWR from "swr";
import Link from "next/link"; // lets make team names clickable, linking to their page
import { DIVISIONS, AFC_DIVISIONS, NFC_DIVISIONS } from "@/lib/divisions"; // manual division groupings
import LoadingSpinner from "@/components/LoadingSpinner";

// helper: fetches and parses JSON from a URL
const fetcher = (url) => fetch(url).then((res) => res.json());

export default function StandingsPage() {
  // fetch standings data, auto-refresh every hour
  const { data, error, isLoading } = useSWR("/api/standings", fetcher, {
    refreshInterval: 3600000,
  });

  // handle loading/error states before trying to use data
  if (error) return <p>Failed to load standings.</p>;
  if (isLoading) return <LoadingSpinner />;

  // ESPN returns two big groups (AFC/NFC conferences), each full of teams
  // flatMap merges both into one single flat array of all 32 teams
  const allTeams = data.children.flatMap((conf) => conf.standings.entries);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="page-title">Standings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AFC column */}
        <div>
          <h2 className="text-2xl text-gray-300 font-bold mb-4"></h2>
          {AFC_DIVISIONS.map((divisionName) => (
            <div key={divisionName} className="mb-6">
              <h3 className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">{divisionName}</h3>
              <div className="card overflow-hidden divide-y divide-white/5">
                {allTeams
                  .filter((entry) => DIVISIONS[divisionName].includes(entry.team.displayName))
                  .map((entry, index) => {
                    const wins = entry.stats.find((s) => s.name === "wins")?.displayValue;
                    const losses = entry.stats.find((s) => s.name === "losses")?.displayValue;
                    const streak = entry.stats.find((s) => s.name === "streak")?.displayValue;
                    const pointDiff = entry.stats.find((s) => s.name === "pointDifferential")?.displayValue;

                    return (
                      <Link key={entry.team.id} href={`/teams/${entry.team.id}`} className="grid grid-cols-[1fr_55px_55px_55px] items-center gap-2 px-3 py-2 transition-colors hover:bg-white/5">
                        <div className="flex items-center gap-3 min-w-0">
                          <img src={entry.team.logos?.[0]?.href} alt={entry.team.displayName} className="w-8 h-8" />
                          <span className="text-gray-200 font-medium sm:whitespace-nowrap">{entry.team.displayName}</span>
                        </div>
                        <div className="contents text-sm tabular-nums">
                          <span className="text-gray-100 font-bold">
                            {wins}-{losses}
                          </span>
                          <span className={streak?.startsWith("W") ? "text-green-400" : "text-red-400"}>{streak}</span>
                          <span className="text-gray-400 w-12 text-right">{pointDiff}</span>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>

        {/* NFC column */}
        <div>
          <h2 className="text-2xl text-gray-300 font-bold mb-4"></h2>
          {NFC_DIVISIONS.map((divisionName) => (
            <div key={divisionName} className="mb-6">
              <h3 className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">{divisionName}</h3>
              <div className="card overflow-hidden divide-y divide-white/5">
                {allTeams
                  .filter((entry) => DIVISIONS[divisionName].includes(entry.team.displayName))
                  .map((entry, index) => {
                    const wins = entry.stats.find((s) => s.name === "wins")?.displayValue;
                    const losses = entry.stats.find((s) => s.name === "losses")?.displayValue;
                    const streak = entry.stats.find((s) => s.name === "streak")?.displayValue;
                    const pointDiff = entry.stats.find((s) => s.name === "pointDifferential")?.displayValue;

                    return (
                      <Link key={entry.team.id} href={`/teams/${entry.team.id}`} className="grid grid-cols-[1fr_55px_55px_55px] items-center gap-2 px-3 py-2 transition-colors hover:bg-white/5">
                        <div className="flex items-center gap-3 min-w-0">
                          <img src={entry.team.logos?.[0]?.href} alt={entry.team.displayName} className="w-8 h-8" />
                          <span className="text-gray-200 font-medium sm:whitespace-nowrap">{entry.team.displayName}</span>
                        </div>
                        <div className="contents text-sm tabular-nums">
                          <span className="text-gray-100 font-bold">
                            {wins}-{losses}
                          </span>
                          <span className={streak?.startsWith("W") ? "text-green-400" : "text-red-400"}>{streak}</span>
                          <span className="text-gray-400 w-12 text-right">{pointDiff}</span>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
