"use client";
import useSWR from "swr";
import Skeleton from "@/components/Skeleton";
import { TEAM_LOGOS } from "@/lib/divisions";
import TeamLogo from "@/components/TeamLogo";

const fetcher = (url) => fetch(url).then((res) => res.json());

// splits one long description into separate moves, starting a new move at each action verb
const VERBS = "Signed|Released|Placed|Waived|Acquired|Terminated|Claimed|Traded|Activated|Re-signed|Reinstated|Designated|Suspended|Elevated|Promoted|Retired";
function splitMoves(description = "") {
  return description
    .split(new RegExp(`(?<=\\.)\\s+(?=(?:${VERBS})\\b)`))
    .map((s) => s.trim())
    .filter(Boolean);
}

// keep a move unless it is only about the practice squad ("from the practice squad to the active roster" stays)
const keepMove = (d) => {
  if (/injured reserve/i.test(d)) return false; // hide IR moves
  return !(/practice squad/i.test(d) && !/active roster/i.test(d)); // hide practice squad moves
};

// tags one single move
function classify(description = "") {
  const d = description.toLowerCase();
  if (d.startsWith("waive")) return { label: "Waived", cls: "bg-orange-900/50 text-orange-300" };
  if (d.startsWith("releas") || d.startsWith("terminat")) return { label: "Released", cls: "bg-red-900/50 text-red-300" };
  if (d.startsWith("acquired") || d.startsWith("traded")) return { label: "Traded", cls: "bg-gold/15 text-gold" };
  if (d.startsWith("sign") || d.startsWith("re-sign")) return { label: "Signed", cls: "bg-green-900/50 text-green-300" };
  return { label: "Other", cls: "bg-white/10 text-gray-300" };
}

export default function TransactionsPage() {
  const { data, error, isLoading } = useSWR("/api/transactions", fetcher, {
    refreshInterval: 600000, // moves happen all day, refresh every 10 min
  });

  if (error || data?.error) return <p className="p-6">Failed to load transactions.</p>;
  if (isLoading) return <Skeleton variant="feed" rows={5} />;

  // one item per move, practice squad moves removed, newest first
  const items = (data.transactions || [])
    .flatMap((t) =>
      splitMoves(t.description)
        .filter(keepMove)
        .map((description) => ({ ...t, description })),
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // group by day: { "Oct 9": [items] }
  const byDay = {};
  items.forEach((t) => {
    // group by ESPN's own calendar date (UTC), so the viewer's time zone can't shift a move to the previous day
    const day = new Date(t.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(t);
  });

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="page-title">Transactions</h1>

      {Object.entries(byDay).map(([day, list]) => (
        <section key={day} className="mb-8">
          <h2 className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-3">{day}</h2>
          <div className="card divide-y divide-white/5">
            {list.map((t, i) => {
              const tag = classify(t.description);
              const logo = t.team?.logo || TEAM_LOGOS[t.team?.displayName];
              return (
                <div key={`${t.date}-${t.team?.id}-${i}`} className="flex items-start gap-3 px-3 py-2.5 sm:px-4">
                  <TeamLogo src={logo} alt={t.team?.displayName || ""} size={28} className="mt-0.5 h-6 w-6 shrink-0 sm:h-7 sm:w-7" />
                  <div className="min-w-0 flex-1">
                    {/* team name and tag on one line, the move underneath */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-100">{t.team?.displayName}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase sm:text-[10px] ${tag.cls}`}>{tag.label}</span>
                    </div>
                    <p className="mt-0.5 text-[13px] leading-snug text-gray-400 sm:text-sm">{t.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
