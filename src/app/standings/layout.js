// server-side wrapper: client pages can't export metadata, so this layout does it
export const metadata = {
  title: "NFL Standings",
  description: "Current NFL standings by division: wins, losses, streaks and point differential for all 32 teams.",
};

export default function Layout({ children }) {
  return children;
}