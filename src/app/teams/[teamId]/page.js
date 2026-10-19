"use client";
import useSWR from "swr";
import { useParams } from "next/navigation";
import Skeleton from "@/components/Skeleton";
import Breadcrumbs from "@/components/Breadcrumbs";
import BackButton from "@/components/BackButton";
import TeamSchedule from "@/components/TeamSchedule";
import TeamLogo from "@/components/TeamLogo";

// the roster is big and sits below the schedule, so it loads after the page paints
const TeamRoster = dynamic(() => import("@/components/TeamRoster"), {
  loading: () => <div className="card mt-8 h-64 animate-pulse bg-white/5" />,
});
import dynamic from "next/dynamic";

// helper: fetches and parses JSON from a URL
const fetcher = (url) => fetch(url).then((res) => res.json());

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
  if (isLoading) return <Skeleton variant="detail" />;

  const { team, schedule, roster, depth } = data;
  const teamColor = `#${team.color}`;

  // roster comes grouped by position group (offense/defense/special teams)
  const positionGroups = roster.athletes || [];

  // schedule events list, each is one game
  const games = schedule.events || [];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Standings", href: "/standings" }, { label: team.displayName }]} />
      <BackButton />
      {/* header banner using team's own color */}
      <div className="flex items-center gap-4 p-5 rounded-xl text-white shadow-lg shadow-black/40 ring-1 ring-white/10" style={{ background: `linear-gradient(135deg, ${teamColor}, #0A0A0A 140%)` }}>
        <TeamLogo src={team.logos?.[0]?.href} alt={team.displayName} size={80} className="w-20 h-20 drop-shadow-lg" />
        <div>
          <h1 className="text-3xl font-extrabold uppercase tracking-wide">{team.displayName}</h1>
          <p>{team.record?.items?.[0]?.summary}</p>
        </div>
      </div>

      <TeamSchedule games={games} teamId={teamId} recordsById={recordsById} byeWeek={schedule.byeWeek} />
      <TeamRoster groups={positionGroups} depth={depth} teamColor={teamColor} />
    </main>
  );
}
