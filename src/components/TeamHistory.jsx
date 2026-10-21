"use client";
import { useState } from "react";
import useSWR from "swr";

const fetcher = (url) => fetch(url).then((res) => res.json());

// collapsed by default; the data only loads once it's opened
export default function TeamHistory({ teamId }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useSWR(open ? `/api/history/${teamId}` : null, fetcher);
  const seasons = data?.seasons || [];

  return (
    <section className="mt-8">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="card flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-white/5">
        <span className="font-mono text-xs uppercase tracking-[0.25em] text-gray-400">Past seasons</span>
        <span className="flex-1 text-xs text-gray-500">{open ? "Last 5 seasons" : "Tap to see record history"}</span>
        <span className={`text-gray-500 transition-transform ${open ? "rotate-90" : ""}`}>›</span>
      </button>

      {open && (
        <div className="card mt-3 overflow-hidden">
          {isLoading && <div className="h-40 animate-pulse bg-white/5" />}
          {!isLoading && seasons.length === 0 && <p className="p-4 text-sm text-gray-500">No past seasons found.</p>}
          {seasons.length > 0 && (
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="bg-white/5 font-mono text-[10px] uppercase tracking-[0.15em] text-gray-500">
                  <th className="px-4 py-2 text-left">Season</th>
                  <th className="px-4 py-2 text-right">Record</th>
                  <th className="px-4 py-2 text-right">Pt diff</th>
                  <th className="px-4 py-2 text-right">Seed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {seasons.map((s) => (
                  <tr key={s.year} className="text-gray-200">
                    <td className="px-4 py-2 font-semibold">{s.year}</td>
                    <td className="px-4 py-2 text-right font-bold text-white">{s.record}</td>
                    <td className={`px-4 py-2 text-right ${String(s.diff).startsWith("+") ? "text-green-400" : "text-red-400"}`}>{s.diff ?? "—"}</td>
                    <td className="px-4 py-2 text-right text-gray-400">{s.seed && s.seed <= 7 ? `#${s.seed}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}