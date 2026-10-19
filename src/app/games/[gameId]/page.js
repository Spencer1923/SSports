"use client";
import useSWR from "swr";
import { useParams } from "next/navigation";
import Skeleton from "@/components/Skeleton";
import BackButton from "@/components/BackButton";
import LiveDriveBanner from "@/components/LiveDriveBanner";
// loaded after the box score paints; the empty placeholder keeps its space so the page doesn't jump
const Placeholder = ({ h }) => <div className="card animate-pulse bg-white/5" style={{ height: h }} />;
const BettingLines = dynamic(() => import("@/components/BettingLines"), { loading: () => <Placeholder h={220} /> });
const WinProbability = dynamic(() => import("@/components/WinProbability"), { loading: () => <Placeholder h={420} /> });
const ScoringSummary = dynamic(() => import("@/components/ScoringSummary"));
const DriveList = dynamic(() => import("@/components/DriveList"));
import TeamLogo from "@/components/TeamLogo";
import dynamic from "next/dynamic";

const fetcher = (url) => fetch(url).then((res) => res.json());

// stats where a LOWER number is better (matched against the stat's name + label)
const LOWER_IS_BETTER = ["interception", "fumbleslost", "turnover", "penalt", "sacksyardslost", "allowed", "giveaway"];

// normalizes a label so "Passing 1st downs" and "passing first downs" compare equal
const norm = (s = "") =>
  s
    .toLowerCase()
    .replace(/1st/g, "first")
    .replace(/[^a-z]/g, "");

// team stats removed from the comparison list (matched after norm)
const HIDDEN_TEAM_STATS = [
  "passingfirstdowns",
  "rushingfirstdowns",
  "firstdownsfrompenalties",
  "yardsperplay",
  "totaldrives",
  "passing",
  "compatt",
  "yardsperpass",
  "interceptionsthrown",
  "sacksyardslost",
  "rushing",
  "rushingattempts",
  "fumbleslost",
  "defensivespecialteamstds",
  "rddownefficiency",
];

// whole player-stat categories removed
const HIDDEN_CATEGORIES = ["fumbles", "interceptions", "kickreturns", "puntreturns", "kicking", "punting"];

// cleans one team's player categories
function cleanCategories(statistics = []) {
  // athlete id -> interception count (the interceptions category's first column is INT)
  const intCat = statistics.find((c) => (c.name || "").toLowerCase() === "interceptions");
  const intsById = {};
  intCat?.athletes?.forEach((a) => {
    intsById[a.athlete.id] = a.stats[0];
  });

  return statistics
    .filter((c) => !HIDDEN_CATEGORIES.includes((c.name || "").toLowerCase()))
    .map((c) => {
      const name = (c.name || "").toLowerCase();
      let labels = c.labels || [];
      let athletes = c.athletes || [];

      if (name === "defensive") {
        const tdIdx = labels.indexOf("TD"); // the TD column gets dropped
        // anyone who only appears in the interceptions list still gets a defensive row
        const ids = new Set(athletes.map((a) => a.athlete.id));
        const extra = (intCat?.athletes || []).filter((a) => !ids.has(a.athlete.id)).map((a) => ({ athlete: a.athlete, stats: labels.map(() => "--") }));

        // drop TD, then add INT as the last column
        athletes = [...athletes, ...extra].map((a) => ({
          ...a,
          stats: [...a.stats.filter((_, i) => i !== tdIdx), intsById[a.athlete.id] ?? "0"],
        }));
        labels = [...labels.filter((_, i) => i !== tdIdx), "INT"];
        // hide players whose whole line is 1 total tackle and zeros everywhere else
        const totIdx = labels.indexOf("TOT");
        if (totIdx !== -1) {
          athletes = athletes.filter((a) => !(Number(a.stats[totIdx]) === 1 && a.stats.every((v, i) => i === totIdx || Number(v) === 0)));
        }
      }

      if (name === "receiving") {
        // hide receivers with 0 receptions
        const recIdx = labels.indexOf("REC");
        if (recIdx !== -1) athletes = athletes.filter((a) => Number(a.stats[recIdx]) > 0);
      }

      return { ...c, labels, athletes };
    })
    .filter((c) => c.athletes.length > 0);
}

// turns a stat value into a number:
// ratio stats ("2-5") become 2/5 = 0.4, count-yards stats ("7-40") use the yards, everything else uses the leading number
function toNumber(value, isRatio, useSecond) {
  const [first, second] = String(value).split(/[-/]/).map(Number);
  if (isRatio) return second ? first / second : 0; // 0 attempts counts as 0
  if (useSecond) return second || 0;
  return parseFloat(value) || 0;
}

export default function GamePage() {
  const { gameId } = useParams();
  const { data, error, isLoading } = useSWR(`/api/games/${gameId}`, fetcher, {
    // refresh every 15s only while the game is live; otherwise don't poll
    refreshInterval: (d) => (d?.header?.competitions?.[0]?.status?.type?.state === "in" ? 15000 : 0),
  });

  if (error) return <p>Failed to load game.</p>;
  if (isLoading) return <Skeleton variant="detail" />;

  // boxscore.teams holds team-level stats (yards, turnovers, etc.)
  const teams = data.boxscore?.teams || [];
  // boxscore.players holds player-level stats grouped by team/category
  const playerStats = (data.boxscore?.players || []).map((t) => ({
    ...t,
    statistics: cleanCategories(t.statistics),
  }));
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
            <TeamLogo src={teams[0]?.team.logo} alt={teams[0]?.team.displayName} size={32} className="w-8 h-8" />
            <span className="text-gray-200 font-semibold">{teams[0]?.team.abbreviation}</span>
          </div>

          <span className="text-3xl font-extrabold tabular-nums text-white">
            {awayScore} - {homeScore}
          </span>

          <div className="flex items-center gap-2">
            <span className="text-gray-200 font-semibold">{teams[1]?.team.abbreviation}</span>
            <TeamLogo src={teams[1]?.team.logo} alt={teams[1]?.team.displayName} size={32} className="w-8 h-8" />
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: `#${teams[1]?.team.color}` }} />
          </div>
        </div>

        {/* build one comparison row per stat, matching stat names across both teams */}
        {teams[0]?.statistics
          .map((stat, i) => ({ stat, otherStat: teams[1]?.statistics[i] })) // pair the two teams first
          .filter(({ stat }) => !HIDDEN_TEAM_STATS.includes(norm(stat.label)))
          .map(({ stat, otherStat }, i) => {
            // parse displayValue as a number where possible, for bar width comparison
            // flip the highlight for stats where lower is better
            const key = `${stat.name}${stat.label}`.toLowerCase().replace(/[\s-]/g, "");
            const lowerBetter = LOWER_IS_BETTER.some((k) => key.includes(k));
            // efficiency stats ("2-5") are compared as a ratio: 2/5 = 0.4
            const isRatio = key.includes("efficiency") || key.includes("redzone");
            const isCountYards = key.includes("penalt"); // "7-40" = 7 penalties for 40 yards, compare the yards
            const val1 = toNumber(stat.displayValue, isRatio, isCountYards);
            const val2 = toNumber(otherStat?.displayValue, isRatio, isCountYards);
            const total = val1 + val2 || 1; // avoid divide-by-zero
            const team1Better = lowerBetter ? val1 <= val2 : val1 >= val2;
            const team2Better = lowerBetter ? val2 <= val1 : val2 >= val1;

            return (
              <div key={`${stat.name}-${i}`} className="mb-4">
                {/* the leading team's number is bright, the trailing one is dim */}
                <div className="flex justify-between items-baseline mb-1">
                  <span className={`text-lg font-bold tabular-nums ${team1Better ? "text-white" : "text-gray-500"}`}>{stat.displayValue}</span>
                  <span className="text-xs uppercase tracking-widest text-gray-400">{stat.label}</span>
                  <span className={`text-lg font-bold tabular-nums ${team2Better ? "text-white" : "text-gray-500"}`}>{otherStat?.displayValue}</span>
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
        <WinProbability plays={data.winprobability} playSource={data} home={homeTeam} away={awayTeam} />
      </div>

      <ScoringSummary plays={data.scoringPlays} teams={teams} />
      <DriveList drives={data.drives} />

      {/* player stats: one grid row per category, so both teams' tables start together */}
      <section>
        {/* team headers, desktop only (on mobile the abbreviation shows inside each category) */}
        <div className="hidden md:grid md:grid-cols-2 gap-8 mb-4">
          {playerStats.map((teamEntry, teamIndex) => (
            <div key={teamEntry.team.id} className={`flex items-center gap-2 ${teamIndex === 1 ? "flex-row-reverse" : ""}`}>
              <TeamLogo src={teamEntry.team.logo} alt={teamEntry.team.displayName} size={24} className="w-6 h-6" />
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
