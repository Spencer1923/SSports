"use client";
import useSWR from "swr";
import { useParams } from "next/navigation";

// helper: fetches and parses JSON from a URL
const fetcher = (url) => fetch(url).then((res) => res.json());

export default function TeamPage() {
  // grab the dynamic [teamId] value from the current URL
  const { teamId } = useParams();

  // fetch this specific team's data from our API route
  const { data, error, isLoading } = useSWR(`/api/teams/${teamId}`, fetcher);

  // handle loading/error states first
  if (error) return <p>Failed to load team.</p>;
  if (isLoading) return <p>Loading team...</p>;

  const team = data.team;

  // team colors come as hex codes without a leading #, so we add it
  const teamColor = `#${team.color}`;

  return (
    <main className="p-6">
      {/* header section with logo + name, styled using the team's own color */}
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
          <h1 className="text-2xl font-bold">{team.displayName}</h1>
          <p>{team.record?.items?.[0]?.summary}</p>
        </div>
      </div>

      {/* basic team info */}
      <div className="mt-4">
        <p><strong>Location:</strong> {team.location}</p>
        <p><strong>Venue:</strong> {team.venue?.fullName}</p>
      </div>

      {/* roster list, if ESPN includes it in this response */}
      {team.athletes && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Roster</h2>
          {team.athletes.map((player) => (
            <p key={player.id}>{player.displayName} — {player.position?.abbreviation}</p>
          ))}
        </div>
      )}
    </main>
  );
}