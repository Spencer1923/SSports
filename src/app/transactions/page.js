"use client";
import useSWR from "swr";
import LoadingSpinner from "@/components/LoadingSpinner";
import { TEAM_LOGOS } from "@/lib/divisions";

const fetcher = (url) => fetch(url).then((res) => res.json());

// sorts the free-text description into Signed / Released / Traded / Waived (anything else = Other)
function classify(description = "") {
  const d = description.toLowerCase();
  if (d.includes("waive")) return { label: "Waived", cls: "bg-orange-900/50 text-orange-300" };
  if (d.includes("releas") || d.includes("cut")) return { label: "Released", cls: "bg-red-900/50 text-red-300" };
  if (d.includes("trade")) return { label: "Traded", cls: "bg-gold/15 text-gold" };
  if (d.includes("sign")) return { label: "Signed", cls: "bg-green-900/50 text-green-300" };
  return { label: "Other", cls: "bg-white/10 text-gray-300" };
}

export default function TransactionsPage() {
  const { data, error, isLoading } = useSWR("/api/transactions", fetcher, {
    refreshInterval: 600000, // moves happen all day, refresh every 10 min
  });

  if (error || data?.error) return <p className="p-6">Failed to load transactions.</p>;
  if (isLoading) return <LoadingSpinner />;

  // newest first
  const items = [...(data.transactions || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

  // group by day: { "Oct 9": [items] }
  const byDay = {};
  items.forEach((t) => {
    const day = new Date(t.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
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
                <div key={`${t.date}-${i}`} className="flex items-center gap-3 px-4 py-3">
                  <img src={logo} alt={t.team?.displayName || ""} className="w-8 h-8 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200">{t.description}</p>
                    <p className="text-xs text-gray-500">{t.team?.displayName}</p>
                  </div>
                  <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-full ${tag.cls}`}>
                    {tag.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}