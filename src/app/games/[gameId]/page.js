"use client";
import useSWR from "swr";
import { useParams } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import BackButton from "@/components/BackButton";
import LiveDriveBanner from "@/components/LiveDriveBanner";
import BettingLines from "@/components/BettingLines";
import WinProbability from "@/components/WinProbability";
import ScoringSummary from "@/components/ScoringSummary";
import DriveList from "@/components/DriveList";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function GamePage() {
  const { gameId } = useParams();
  const { data, error, isLoading } = useSWR(`/api/games/${gameId}`, fetcher);

  if (error) return <p>Failed to load game.</p>;
  if (isLoading) return <LoadingSpinner />;

  // boxscore.teams holds team-level stats (yards, turnovers, etc.)
  const teams = data.boxscore?.teams || [];
  // boxscore.players holds player-level stats grouped by team/category
  const playerStats = data.boxscore?.players || [];
  // header.competitions[0].competitors holds live scores; boxscore.teams doesn't include score
  const competitors = data.header?.competitions?.[0]?.competitors || [];
  const awayScore = competitors.find((c) => c.homeAway === "away")?.score;
  const homeScore = competitors.find((c) => c.homeAway === "home")?.score;

  // figure out which boxscore team is home/away (used by odds and win probability)
  const homeId = competitors.find((c) => c.homeAway === "home")?.id || competitors.find((c) => c.homeAway === "home")?.team?.id;
  const homeTeam = teams.find((t) => t.team.id === homeId)?.team;
  const awayTeam = teams.find((t) => t.team.id !== homeId)?.team;

  // every category name across both teams (passing, rushing, defensive...), in order
  const categoryNames = [...new Set(playerStats.flatMap((t) => t.statistics.map((c) => c.name)))];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <BackButton />
      <h1 className="page-title">Box Score</h1>
      <LiveDriveBanner data={data} />

      {/* team stat comparison — side by side bars for each stat */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: `#${teams[0]?.team.color}` }} />
            <img src={teams[0]?.team.logo} alt={teams[0]?.team.displayName} className="w-8 h-8" />
            <span className="text-gray-200 font-semibold">{teams[0]?.team.abbreviation}</span>
          </div>

          <span className="text-3xl font-extrabold tabular-nums text-white">
            {awayScore} - {homeScore}
          </span>

          <div className="flex items-center gap-2">
            <span className="text-gray-200 font-semibold">{teams[1]?.team.abbreviation}</span>
            <img src={teams[1]?.team.logo} alt={teams[1]?.team.displayName} className="w-8 h-8" />
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: `#${teams[1]?.team.color}` }} />
          </div>
        </div>

        {/* build one comparison row per stat, matching stat names across both teams */}
        {teams[0]?.statistics.map((stat, i) => {
          const otherStat = teams[1]?.statistics[i];
          // parse displayValue as a number where possible, for bar width comparison
          const val1 = parseFloat(stat.displayValue) || 0;
          const val2 = parseFloat(otherStat?.displayValue) || 0;
          const total = val1 + val2 || 1; // avoid divide-by-zero

          return (
            <div key={`${stat.name}-${i}`} className="mb-4">
              {/* the leading team's number is bright, the trailing one is dim */}
              <div className="flex justify-between items-baseline mb-1">
                <span className={`text-lg font-bold tabular-nums ${val1 >= val2 ? "text-white" : "text-gray-500"}`}>{stat.displayValue}</span>
                <span className="text-xs uppercase tracking-widest text-gray-400">{stat.label}</span>
                <span className={`text-lg font-bold tabular-nums ${val2 >= val1 ? "text-white" : "text-gray-500"}`}>{otherStat?.displayValue}</span>
              </div>

              {/* two rounded segments with a gap, a glossy top highlight, and a thin ring (replaces the white border) */}
              <div className="flex h-3 gap-1">
                <div
                  className="rounded-l-full ring-1 ring-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] transition-all duration-700"
                  style={{ width: `${(val1 / total) * 100}%`, backgroundColor: `#${teams[0]?.team.color || "8B0000"}` }}
                />
                <div
                  className="rounded-r-full ring-1 ring-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] transition-all duration-700"
                  style={{ width: `${(val2 / total) * 100}%`, backgroundColor: `#${teams[1]?.team.color || "D4AF37"}` }}
                />
              </div>
            </div>
          );
        })}
      </section>

      {/* betting lines + win probability side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <BettingLines pickcenter={data.pickcenter} home={homeTeam} away={awayTeam} />
        <WinProbability plays={data.winprobability} home={homeTeam} away={awayTeam} />
      </div>

      <ScoringSummary plays={data.scoringPlays} teams={teams} />
      <DriveList drives={data.drives} />

      {/* player stats: one grid row per category, so both teams' tables start together */}
      <section>
        {/* team headers, desktop only (on mobile the abbreviation shows inside each category) */}
        <div className="hidden md:grid md:grid-cols-2 gap-8 mb-4">
          {playerStats.map((teamEntry, teamIndex) => (
            <div key={teamEntry.team.id} className={`flex items-center gap-2 ${teamIndex === 1 ? "flex-row-reverse" : ""}`}>
              <img src={teamEntry.team.logo} alt={teamEntry.team.displayName} className="w-6 h-6" />
              <h3 className="font-semibold text-gray-200">{teamEntry.team.displayName}</h3>
            </div>
          ))}
        </div>

        {categoryNames.map((name) => (
          <div key={name} className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-4 items-start">
            {playerStats.map((teamEntry) => {
              const category = teamEntry.statistics.find((c) => c.name === name);
              if (!category) return <div key={teamEntry.team.id} />; // this team has no stats in this category

              return (
                <div key={teamEntry.team.id} className="card overflow-hidden overflow-x-auto divide-y divide-white/5">
                  <div className="bg-white/5 px-3 py-1">
                    <p className="text-gray-300 text-sm font-semibold capitalize">
                      {category.name}
                      <span className="md:hidden text-gray-500 text-xs"> · {teamEntry.team.abbreviation}</span>
                    </p>
                  </div>
                  {category.labels && (
                    <div className="flex gap-3 px-3 py-1 text-xs text-gray-500">
                      <span className="flex-1" />
                      {category.labels.map((label, li) => (
                        <span key={li} className="w-12 text-center">
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                  {category.athletes.map((entry) => (
                    <div key={entry.athlete.id} className="flex gap-3 px-3 py-2 text-sm hover:bg-white/5 transition-colors">
                      <span className="text-gray-200 flex-1">{entry.athlete.displayName}</span>
                      {entry.stats.map((stat, i) => (
                        <span key={i} className="text-gray-400 w-12 text-center tabular-nums">
                          {stat}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </section>
    </main>
  );
}
