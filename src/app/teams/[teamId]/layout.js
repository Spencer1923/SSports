import { TEAM_IDS } from "@/lib/divisions";

// builds each team's title from its id, e.g. "Green Bay Packers: Schedule, Roster & Stats | SSports"
export async function generateMetadata({ params }) {
  const { teamId } = await params;
  // TEAM_IDS maps name -> id, so find the name whose id matches
  const name = Object.keys(TEAM_IDS).find((n) => TEAM_IDS[n] === teamId);
  if (!name) return {};
  return {
    title: `${name}: Schedule, Roster & Stats`,
    description: `${name} schedule, roster, results by season and head-to-head history on SSports.`,
    alternates: { canonical: `/teams/${teamId}` },
  };
}

export default function Layout({ children }) {
  return children;
}