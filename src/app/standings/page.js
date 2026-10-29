"use client";
import useSWR from "swr";
import Link from "next/link"; // lets make team names clickable, linking to their page
import { DIVISIONS, AFC_DIVISIONS, NFC_DIVISIONS } from "@/lib/divisions"; // manual division groupings
import Skeleton from "@/components/Skeleton";
import { prefetchProps } from "@/lib/prefetch";
import TeamLogo from "@/components/TeamLogo";

// helper: fetches and parses JSON from a URL
const fetcher = (url) => fetch(url).then((res) => res.json());

export default function StandingsPage() {
  // fetch standings data, auto-refresh every hour
  const { data, error, isLoading } = useSWR("/api/standings", fetcher, {
    refreshInterval: 300000, // 5 min, matches the route's cache time
  });

  // handle loading/error states before trying to use data
  if (error) return <p>Failed to load standings.</p>;
  if (isLoading) return <Skeleton variant="rows" count={8} />;

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
            <div key={divisionName} className="mb-4 sm:mb-6">
              <h3 className="mb-1.5 text-[10px] uppercase tracking-[0.2em] text-gray-400 sm:mb-2 sm:text-xs">{divisionName}</h3>
              <div className="card overflow-hidden divide-y divide-white/5">
                {allTeams
                  .filter((entry) => DIVISIONS[divisionName].includes(entry.team.displayName))
                  .map((entry, index) => {
                    const wins = entry.stats.find((s) => s.name === "wins")?.displayValue;
                    const losses = entry.stats.find((s) => s.name === "losses")?.displayValue;
                    const streak = entry.stats.find((s) => s.name === "streak")?.displayValue;
                    const pointDiff = entry.stats.find((s) => s.name === "pointDifferential")?.displayValue;

                    return (
                      <Link
                        key={entry.team.id}
                        href={`/teams/${entry.team.id}`}
                        {...prefetchProps(`/api/teams/${entry.team.id}`)}
                        className="grid grid-cols-[minmax(0,1fr)_46px_34px_44px] items-center gap-1.5 px-2.5 py-1.5 transition-colors hover:bg-white/5 sm:grid-cols-[1fr_55px_55px_55px] sm:gap-2 sm:px-3 sm:py-2">
                        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                          <TeamLogo src={entry.team.logos?.[0]?.href} alt={entry.team.displayName} size={32} className="h-6 w-6 sm:h-8 sm:w-8" />
                          <span className="truncate text-[13px] font-medium text-gray-200 sm:whitespace-nowrap sm:text-base"> {entry.team.displayName}</span>
                        </div>
                        <div className="contents text-xs tabular-nums sm:text-sm">
                          <span className="text-gray-100 font-bold">
                            {wins}-{losses}
                          </span>
                          <span className={streak?.startsWith("W") ? "text-green-400" : "text-red-400"}>{streak}</span>
                          <span className="text-center text-gray-400 sm:w-12 sm:text-right">{pointDiff}</span>
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
            <div key={divisionName} className="mb-4 sm:mb-6">
              <h3 className="mb-1.5 text-[10px] uppercase tracking-[0.2em] text-gray-400 sm:mb-2 sm:text-xs">{divisionName}</h3>
              <div className="card overflow-hidden divide-y divide-white/5">
                {allTeams
                  .filter((entry) => DIVISIONS[divisionName].includes(entry.team.displayName))
                  .map((entry, index) => {
                    const wins = entry.stats.find((s) => s.name === "wins")?.displayValue;
                    const losses = entry.stats.find((s) => s.name === "losses")?.displayValue;
                    const streak = entry.stats.find((s) => s.name === "streak")?.displayValue;
                    const pointDiff = entry.stats.find((s) => s.name === "pointDifferential")?.displayValue;

                    return (
                      <Link
                        key={entry.team.id}
                        href={`/teams/${entry.team.id}`}
                        {...prefetchProps(`/api/teams/${entry.team.id}`)}
                        className="grid grid-cols-[minmax(0,1fr)_46px_34px_44px] items-center gap-1.5 px-2.5 py-1.5 transition-colors hover:bg-white/5 sm:grid-cols-[1fr_55px_55px_55px] sm:gap-2 sm:px-3 sm:py-2">
                        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                          <TeamLogo src={entry.team.logos?.[0]?.href} alt={entry.team.displayName} size={32} className="h-6 w-6 sm:h-8 sm:w-8" />
                          <span className="truncate text-[13px] font-medium text-gray-200 sm:whitespace-nowrap sm:text-base">{entry.team.displayName}</span>
                        </div>
                        <div className="contents text-xs tabular-nums sm:text-sm">
                          <span className="text-gray-100 font-bold">
                            {wins}-{losses}
                          </span>
                          <span className={streak?.startsWith("W") ? "text-green-400" : "text-red-400"}>{streak}</span>
                          <span className="text-center text-gray-400 sm:w-12 sm:text-right">{pointDiff}</span>
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
