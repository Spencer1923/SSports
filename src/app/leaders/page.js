"use client";
import useSWR from "swr";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function LeadersPage() {
  const { data, error, isLoading } = useSWR("/api/leaders", fetcher, {
    refreshInterval: 3600000, // leaders don't change fast, refresh hourly
  });

  if (error) return <p>Failed to load leaders.</p>;
  if (isLoading) return <LoadingSpinner />;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="page-title">League Leaders</h1>

      {data.categories.map((category) => {
        const [first, ...rest] = category.leaders; // split #1 from #2-5

        return (
          <div key={category.name} className="mb-10">
            <h2 className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-3">{category.displayName}</h2>

            {/* #1 leader: big card with headshot */}
            {first && (
              <Link href={`/players/${first.athleteId}`} className="card card-hover flex items-center gap-4 mb-3 p-4 text-gray-200">
                <img src={first.headshot} alt={first.athleteName} className="w-20 h-20 rounded-full object-cover ring-2 ring-gold/60" />
                <div>
                  <p className="text-lg font-bold">{first.athleteName}</p>
                  <p className="text-gray-400">{first.displayValue}</p>
                </div>
              </Link>
            )}

            {/* #2-5: smaller rows with team logo */}
            <div className="space-y-2">
              {rest.map((leader, index) => (
                <Link key={leader.athleteId} href={`/players/${leader.athleteId}`} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded text-gray-300 transition-colors">
                  <span className="text-gray-400 w-4">{index + 2}</span>
                  <img src={leader.teamLogo} alt="" className="w-6 h-6" />
                  <span>{leader.athleteName}</span>
                  <span className="text-gray-400 ml-auto tabular-nums">{leader.displayValue}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </main>
  );
}
