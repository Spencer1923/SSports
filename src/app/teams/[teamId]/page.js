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

  if (error) return <p>Failed to load team.</p>;
  if (isLoading) return <LoadingSpinner />;

  const { team, schedule, roster } = data;
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
          <h1 className="text-2xl font-bold text-gray-100">{team.displayName}</h1>
          <p>{team.record?.items?.[0]?.summary}</p>
        </div>
      </div>

      {/* schedule section */}
      <section className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Schedule</h2>
        {games.map((game) => (
          <p className="text-gray-300" key={game.id}>
            {game.name} — {new Date(game.date).toLocaleDateString()}
          </p>
        ))}
      </section>

      {/* roster section, grouped by position */}
      <section className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Roster</h2>
        {(() => {
          // flatten in case data is nested in groups already, then re-group by position
          const allPlayers = positionGroups.flatMap((g) => g.items || [g]);
          const grouped = groupByPosition(allPlayers);

          return Object.entries(grouped).map(([position, players]) => (
            <div key={position} className="mb-4">
              <h3 className="font-semibold">{position}</h3>
              {players.map((player) => (
                <Link key={player.id} href={`/players/${player.id}`} className="block text-gray-300 hover:text-crimson">
                  #{player.jersey} {player.displayName}
                </Link>
              ))}
            </div>
          ));
        })()}
      </section>
    </main>
  );
}
