"use client";
import useSWR from "swr";
import { useParams } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";

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

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-[#D4AF37] border-b-2 border-[#8B0000] pb-2">
        Box Score
      </h1>

      {/* team stat comparison — side by side bars for each stat */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: `#${teams[0]?.team.color}` }}
            />
            <img
              src={teams[0]?.team.logo}
              alt={teams[0]?.team.displayName}
              className="w-8 h-8"
            />
            <span className="text-gray-200 font-semibold">
              {teams[0]?.team.abbreviation}
            </span>
          </div>

          <span className="text-xl font-bold text-gray-100">
            {awayScore} - {homeScore}
          </span>

          <div className="flex items-center gap-2">
            <span className="text-gray-200 font-semibold">
              {teams[1]?.team.abbreviation}
            </span>
            <img
              src={teams[1]?.team.logo}
              alt={teams[1]?.team.displayName}
              className="w-8 h-8"
            />
            <span
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: `#${teams[1]?.team.color}` }}
            />
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
            <div key={stat.name} className="mb-3">
              <div className="flex justify-between text-sm text-gray-400 mb-1">
                <span>{stat.displayValue}</span>
                <span className="text-gray-500">{stat.label}</span>
                <span>{otherStat?.displayValue}</span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-neutral-800">
                <div
                  style={{
                    width: `${(val1 / total) * 100}%`,
                    backgroundColor: `#${teams[0]?.team.color || "8B0000"}`,
                  }}
                />
                <div
                  style={{
                    width: `${(val2 / total) * 100}%`,
                    backgroundColor: `#${teams[1]?.team.color || "D4AF37"}`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </section>

      {/* player stats — grouped by team, tabular layout per category */}
      <section>
        {/*<h2 className="text-xl font-semibold mb-4 text-[#D4AF37]">
          Player Stats
        </h2>*/}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {playerStats.map((teamEntry, teamIndex) => (
            <div key={teamEntry.team.id}>
              <div
                className={`flex items-center gap-2 mb-3 ${teamIndex === 1 ? "flex-row-reverse" : ""}`}
              >
                <img
                  src={teamEntry.team.logo}
                  alt={teamEntry.team.displayName}
                  className="w-6 h-6"
                />
                <h3 className="font-semibold text-gray-200">
                  {teamEntry.team.displayName}
                </h3>
              </div>

              {teamEntry.statistics.map((category) => (
                <div
                  key={category.name}
                  className="mb-4 rounded-lg overflow-hidden border border-neutral-700 overflow-x-auto"
                >
                  <div className="bg-neutral-800 px-3 py-1">
                    <p className="text-gray-300 text-sm font-semibold capitalize">
                      {category.name}
                    </p>
                  </div>
                  {category.labels && (
                    <div className="flex gap-3 px-3 py-1 text-xs text-gray-500">
                      <span className="flex-1" />
                      {category.labels.map((label) => (
                        <span key={label} className="w-12 text-center">
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                  {category.athletes.map((entry, index) => (
                    <div
                      key={entry.athlete.id}
                      className={`flex gap-3 px-3 py-2 text-sm ${
                        index % 2 === 0 ? "bg-neutral-900" : "bg-neutral-800"
                      }`}
                    >
                      <span className="text-gray-200 flex-1">
                        {entry.athlete.displayName}
                      </span>
                      {entry.stats.map((stat, i) => (
                        <span
                          key={i}
                          className="text-gray-400 w-12 text-center"
                        >
                          {stat}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
