"use client";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function GameLog({ playerId, hideTabs = [] }) {
  const { data, error, isLoading } = useSWR(`/api/players/${playerId}/gamelog`, fetcher);
  const [tab, setTab] = useState(0); // which category tab is showing

  if (isLoading) return <div className="card h-24 animate-pulse bg-white/5" />;
  if (error || data?.error || !data?.games?.length) return null;

  // turn each category's count into a slice of the label/stat columns
  const cats = data.categories?.length ? data.categories : [{ name: "Season", count: data.labels.length }];
  // each tab starts where the previous categories' columns end
  let tabs = cats.map((c, i) => {
    const from = cats.slice(0, i).reduce((sum, x) => sum + x.count, 0);
    return { name: c.name, from, to: from + c.count };
  });
  // linebackers / edge rushers / DTs: no Fumbles or Interceptions tabs
  tabs = tabs.filter((t) => !hideTabs.includes(t.name.toLowerCase()));
  if (!tabs.length) return null;

  const cur = tabs[Math.min(tab, tabs.length - 1)];
  const slice = (arr) => arr.slice(cur.from, cur.to);

  return (
    <div className="card p-3 sm:p-4">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <p className="mr-2 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500 sm:text-[11px]">Game log</p>
        {tabs.length > 1 &&
          tabs.map((t, i) => (
            <button
              key={t.name}
              onClick={() => setTab(i)}
              className={`cursor-pointer rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wide transition sm:text-xs ${cur === t ? "bg-gold font-bold text-black" : "border border-white/10 text-gray-400 hover:text-white"}`}>
              {t.name}
            </button>
          ))}
      </div>

      {/* scrolls sideways if the columns don't fit on a phone */}
      <div className="overflow-x-auto">
        <table className="w-full text-center text-[11px] tabular-nums sm:text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-gray-500">
              <th className="px-2 py-1 text-left font-normal">Wk</th>
              <th className="px-2 py-1 text-left font-normal">Opp</th>
              <th className="px-2 py-1 font-normal">Result</th>
              {slice(data.labels).map((l, i) => (
                <th key={i} className="px-2 py-1 font-normal">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.games.map((g) => (
              <tr key={g.id} className="text-gray-200">
                <td className="px-2 py-1 text-left text-gray-500">{g.week}</td>
                <td className="whitespace-nowrap px-2 py-1 text-left">
                  <Link href={`/games/${g.id}`} className="hover:text-gold">
                    {g.atVs} {g.opp}
                  </Link>
                </td>
                <td className={`whitespace-nowrap px-2 py-1 ${g.result === "W" ? "text-green-400" : "text-red-400"}`}>
                  {g.result} {g.score}
                </td>
                {slice(g.stats).map((s, i) => (
                  <td key={i} className="px-2 py-1">
                    {s}
                  </td>
                ))}
              </tr>
            ))}
            {/* season totals */}
            <tr className="font-bold text-white">
              <td className="px-2 py-1 text-left" colSpan={3}>
                Total
              </td>
              {slice(data.totals).map((s, i) => (
                <td key={i} className="px-2 py-1">
                  {s}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
