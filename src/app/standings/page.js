"use client";
import useSWR from "swr";
import Link from "next/link"; // lets us make team names clickable, linking to their page
import { DIVISIONS } from "@/lib/divisions"; // our manual division groupings

// helper: fetches and parses JSON from a URL
const fetcher = (url) => fetch(url).then((res) => res.json());

export default function StandingsPage() {
  // fetch standings data, auto-refresh every hour
  const { data, error, isLoading } = useSWR("/api/standings", fetcher, {
    refreshInterval: 3600000,
  });

  // handle loading/error states before trying to use data
  if (error) return <p>Failed to load standings.</p>;
  if (isLoading) return <p>Loading standings...</p>;

  // ESPN returns two big groups (AFC/NFC conferences), each full of teams
  // flatMap merges both into one single flat array of all 32 teams
  const allTeams = data.children.flatMap((conf) => conf.standings.entries);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Standings</h1>

      {/* loop through each division name + its list of team names */}
      {Object.entries(DIVISIONS).map(([divisionName, teamNames]) => (
        <div key={divisionName} className="mb-6">
          <h2 className="text-xl font-semibold">{divisionName}</h2>

          {/* keep only teams whose name matches this division's team list */}
          {allTeams
            .filter((entry) => teamNames.includes(entry.team.displayName))
            .map((entry) => (
              <Link
                key={entry.team.id}
                href={`/teams/${entry.team.id}`}
                className="flex items-center gap-2 text-blue-600 hover:underline"
              >
                {/* small team logo next to the name */}
                <img
                  src={entry.team.logos?.[0]?.href}
                  alt={entry.team.displayName}
                  className="w-6 h-6"
                />
                {entry.team.displayName} —{" "}
                {entry.stats.find((s) => s.name === "wins")?.displayValue}-
                {entry.stats.find((s) => s.name === "losses")?.displayValue}
              </Link>
            ))}
        </div>
      ))}
    </main>
  );
}
