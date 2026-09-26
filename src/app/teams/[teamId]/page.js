"use client";
import useSWR from "swr";
import { useParams } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";

// helper: fetches and parses JSON from a URL
const fetcher = (url) => fetch(url).then((res) => res.json());

// helper: groups a flat list of players by their position
function groupByPosition(players) {
  const groups = {};
  players.forEach((player) => {
    const pos = player.position?.abbreviation || "Other";
    if (!groups[pos]) groups[pos] = []; // create array if this position not seen yet
    groups[pos].push(player);
  });
  return groups;
}

export default function TeamPage() {
  const { teamId } = useParams();
  const { data, error, isLoading } = useSWR(`/api/teams/${teamId}`, fetcher);
  const { data: standingsData } = useSWR("/api/standings", fetcher);

  // build a lookup: team id → win-loss record, from standings data
  const recordsById = {};
  standingsData?.children.forEach((conf) => {
    conf.standings.entries.forEach((entry) => {
      const wins = entry.stats.find((s) => s.name === "wins")?.displayValue;
      const losses = entry.stats.find((s) => s.name === "losses")?.displayValue;
      recordsById[entry.team.id] = `${wins}-${losses}`;
    });
  });

  if (error) return <p>Failed to load team.</p>;
  if (isLoading) return <LoadingSpinner />;

  const { team, schedule, roster, depth } = data;
  const teamColor = `#${team.color}`;

  // roster comes grouped by position group (offense/defense/special teams)
  const positionGroups = roster.athletes || [];

  // schedule events list, each is one game
  const games = schedule.events || [];

  return (
    <main className="p-6">
      {/* header banner using team's own color */}
      <div
        className="flex items-center gap-4 p-4 rounded text-white"
        style={{ backgroundColor: teamColor }}
      >
        <img
          src={team.logos?.[0]?.href}
          alt={team.displayName}
          className="w-16 h-16"
        />
        <div>
          <h1 className="text-2xl font-bold text-gray-100">
            {team.displayName}
          </h1>
          <p>{team.record?.items?.[0]?.summary}</p>
        </div>
      </div>

      {/* schedule section, grouped by week */}
      <section className="mt-6">
        <h2 className="text-xl font-semibold mb-2 text-gray-200">Schedule</h2>

        {games.map((game) => {
          const competitors = game.competitions?.[0]?.competitors || [];
          const self = competitors.find((c) => c.team.id === teamId);
          const opponent = competitors.find((c) => c.team.id !== teamId);
          const isHome = self?.homeAway === "home";

          // fallback: some ESPN responses use "logo" (string), others "logos" (array)
          const opponentLogo =
            opponent?.team.logo || opponent?.team.logos?.[0]?.href;
          console.log(
            "upcoming opponent:",
            opponent?.team.displayName,
            opponent?.record,
          );

          const formattedDate = new Date(game.date).toLocaleDateString(
            "en-US",
            {
              weekday: "long",
              month: "short",
              day: "numeric",
            },
          );

          return (
            <div key={game.id} className="mb-4">
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">
                {game.week?.text}
              </p>
              <div className="flex items-center justify-between px-3 py-2 text-sm rounded-lg border border-neutral-700 bg-neutral-900">
                <div className="flex items-center gap-2">
                  <img
                    src={team.logos?.[0]?.href}
                    alt={team.displayName}
                    className="w-6 h-6"
                  />
                  <span className="text-gray-200">{isHome ? "vs" : "@"}</span>
                  <img
                    src={opponentLogo}
                    alt={opponent?.team.displayName}
                    className="w-6 h-6"
                  />
                  <span className="text-gray-200">
                    {opponent?.team.displayName}
                  </span>
                  <span className="text-gray-500 text-xs">
                    ({recordsById[opponent?.team.id] || "—"})
                  </span>
                </div>
                <span className="text-gray-400">{formattedDate}</span>
              </div>
            </div>
          );
        })}
      </section>

      {/* roster section, grouped by position */}
      {/* roster section, ordered by depth chart position (starters first) */}
      <section className="mt-6">
        <h2 className="text-xl font-semibold mb-2 text-gray-200">Roster</h2>
        {(() => {
          const allPlayers = positionGroups.flatMap((g) => g.items || [g]);
          const playersById = {};
          allPlayers.forEach((p) => {
            playersById[p.id] = p;
          });

          // merge all formations' positions into one map, keyed by the position map's own key
          // (e.g. "wr1", "wr2", "lt") so distinct slots at the same position aren't overwritten
          const positionMap = {};
          depth.depthchart?.forEach((formation) => {
            Object.entries(formation.positions || {}).forEach(
              ([key, posEntry]) => {
                if (!positionMap[key]) {
                  positionMap[key] = {
                    name: posEntry.position?.displayName,
                    athletes: posEntry.athletes,
                  };
                }
              },
            );
          });

          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Object.entries(positionMap).map(([key, { name, athletes }]) => (
                <div
                  key={key}
                  className="rounded-lg border border-neutral-700 bg-neutral-900 p-3"
                >
                  <h3 className="font-bold text-gray-100 mb-2">{name}</h3>
                  <div className="flex flex-col gap-1">
                    {athletes.map((athleteRef, depthIndex) => {
                      const player = playersById[athleteRef.id];
                      if (!player) return null;

                      return (
                        <Link
                          key={player.id}
                          href={`/players/${player.id}`}
                          className="flex items-center gap-1 text-sm text-gray-300 hover:text-[#8B0000]"
                        >
                          <span className="text-gray-500 text-xs w-3">
                            {depthIndex + 1}
                          </span>
                          <span className="truncate">{player.displayName}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </section>
    </main>
  );
}
