"use client";
import useSWR from "swr";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const fetcher = (url) => fetch(url).then((res) => res.json());

// formats a date like Thu, Oct 8 with a superscript, and has local time
function formatGameDate(dateString) {
  const d = new Date(dateString);
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const day = d.getDate();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  // ordinal suffix: 1st, 2nd, 3rd, 4th.....
  const suffix = day > 3 && day < 21 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[day % 10] || "th";

  return (
    <>
      {weekday}, {month} {day}
      <sup>{suffix}</sup> {time}
    </>
  );
}

export default function Scoreboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // read week from the URL's ?week= param — null means current week
  const week = searchParams.get("week") ? Number(searchParams.get("week")) : null;

  const url = week ? `/api/scores?week=${week}` : "/api/scores";
  const { data, error, isLoading } = useSWR(url, fetcher, {
    refreshInterval: 30000, // refresh every 30s
  });

  // track previous scores to detect changes and trigger a flash animation
  const prevScores = useRef({});
  const [flashIds, setFlashIds] = useState({});

  useEffect(() => {
    if (!data) return;
    const newFlashIds = {};
    data.events.forEach((game) => {
      const competitors = game.competitions[0].competitors;
      competitors.forEach((c) => {
        const key = `${game.id}-${c.team.id}`;
        if (prevScores.current[key] !== undefined && prevScores.current[key] !== c.score) {
          newFlashIds[key] = true;
        }
        prevScores.current[key] = c.score;
      });
    });
    if (Object.keys(newFlashIds).length > 0) {
      setFlashIds(newFlashIds);
      setTimeout(() => setFlashIds({}), 1000); // clear flash after 1s
    }
  }, [data]);

  if (error) return <p>Failed to load scores.</p>;
  if (isLoading) return <LoadingSpinner />;

  // ESPN's response includes the current week number so we can initialize navigation from it
  const currentWeek = week ?? data?.week?.number ?? 1;

  return (
    <div>
      {/* week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.push(`/?week=${Math.max(1, currentWeek - 1)}`)} className="text-gray-300 hover:text-white px-3 py-1 border border-gray-700 rounded cursor-pointer hover:border-crimson">
          ← Prev
        </button>
        <span className="text-gray-200 font-semibold">Week {currentWeek}</span>
        <button onClick={() => router.push(`/?week=${Math.min(18, currentWeek + 1)}`)} className="text-gray-300 hover:text-white px-3 py-1 border border-gray-700 rounded cursor-pointer hover:border-crimson">
          Next →
        </button>
      </div>

      <div className="grid gap-3">
        {data.events.map((game) => {
          // ESPN lists competitors as [home, away] or [away, home] depending on game — sort by homeAway field
          const competitors = game.competitions[0].competitors;
          const home = competitors.find((c) => c.homeAway === "home");
          const away = competitors.find((c) => c.homeAway === "away");

          return (
            <Link key={game.id} href={`/games/${game.id}`} className="group block border border-gray-700 rounded-lg p-3 bg-gray-950 hover:bg-gray-800 transition-colors hover:border-crimson">
              {/* game status at top, small and subtle */}
              <p className="text-xs text-gray-400 mb-2 group-hover:text-gray-100">{game.status.type.state === "pre" ? formatGameDate(game.date) : game.status.type.detail}</p>

              {/* away team row */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <img src={away.team.logo} alt={away.team.displayName} className="w-6 h-6" />
                  <span className="text-gray-300 text-sm group-hover:text-white">{away.team.shortDisplayName}</span>
                </div>
                {game.status.type.state !== "pre" && (
                  <span className={`font-bold text-gray-300 group-hover:text-white transition-colors ${flashIds[`${game.id}-${away.team.id}`] ? "text-gold scale-125" : ""} inline-block`}>
                    {away.score}
                  </span>
                )}
              </div>

              {/* home team row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src={home.team.logo} alt={home.team.displayName} className="w-6 h-6" />
                  <span className="text-gray-300 text-sm group-hover:text-white">{home.team.shortDisplayName}</span>
                </div>
                {game.status.type.state !== "pre" && (
                  <span className={`font-bold text-gray-300 group-hover:text-white transition-colors ${flashIds[`${game.id}-${home.team.id}`] ? "text-gold scale-125" : ""} inline-block`}>
                    {home.score}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
