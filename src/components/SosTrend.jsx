"use client";
import { useMemo, useState } from "react";
import TeamLogo from "@/components/TeamLogo";
import { computeRemainingSOS } from "@/lib/playoffs";

// line colors for up to 8 selected teams
const COLORS = ["#D4AF37", "#ef4444", "#22c55e", "#38bdf8", "#a78bfa", "#fb923c", "#f472b6", "#94a3b8"];
const MAX = COLORS.length;

// chart size and padding (the SVG scales to the screen width)
const W = 600;
const H = 260;
const PAD = { l: 44, r: 16, t: 12, b: 28 };

const fmt = (v) => v.toFixed(3).replace(/^0/, ""); // 0.512 -> .512

export default function SosTrend({ games, meta }) {
  const [open, setOpen] = useState(false); // collapsed by default
  const [picked, setPicked] = useState(null); // null = use the default teams

  // one entry per fully played week: { week, sos: { teamId: { left, sos } } }
  const points = useMemo(() => {
    if (!open) return [];
    const weeks = [...new Set(games.map((g) => g.week))]
      .sort((a, b) => a - b)
      .filter((w) => games.filter((g) => g.week === w).every((g) => g.completed));
    return weeks.map((w) => {
      // pretend only games up to week w have been played
      const view = games.map((g) => ({ ...g, completed: g.completed && g.week <= w }));
      return { week: w, sos: computeRemainingSOS(view, {}, meta) };
    });
  }, [open, games, meta]);

  // default teams: the 3 toughest and 3 easiest remaining schedules at the latest week
  const defaults = useMemo(() => {
    const last = points[points.length - 1];
    if (!last) return [];
    const ids = Object.keys(last.sos).sort((a, b) => last.sos[b].sos - last.sos[a].sos);
    return [...ids.slice(0, 3), ...ids.slice(-3)];
  }, [points]);

  const selected = picked ?? defaults;
  const teams = useMemo(() => Object.values(meta).sort((a, b) => a.abbr.localeCompare(b.abbr)), [meta]);

  // click a logo to add or remove that team (max 8)
  const toggle = (id) =>
    setPicked((prev) => {
      const cur = prev ?? defaults;
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      return cur.length >= MAX ? cur : [...cur, id];
    });

  // y range fits the selected lines, with a little padding
  const vals = selected.flatMap((id) => points.map((p) => p.sos[id].sos));
  const lo = Math.max(0, (vals.length ? Math.min(...vals) : 0.4) - 0.02);
  const hi = Math.min(1, (vals.length ? Math.max(...vals) : 0.6) + 0.02);
  const n = points.length;
  const x = (i) => PAD.l + (n > 1 ? (i / (n - 1)) * (W - PAD.l - PAD.r) : 0);
  const y = (v) => PAD.t + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD.t - PAD.b);
  const path = (vs) => vs.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  // league average per week (a reference line)
  const avg = points.map((p) => {
    const all = Object.values(p.sos);
    return all.reduce((s, t) => s + t.sos, 0) / all.length;
  });

  const ticks = [0, 1, 2, 3].map((i) => lo + ((hi - lo) * i) / 3);

  return (
    <section>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="card flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-white/5">
        <span className="font-mono text-xs uppercase tracking-[0.25em] text-gray-400">Schedule strength over time</span>
        <span className="flex-1 text-xs text-gray-500">{open ? "Remaining SOS after each week" : "Tap to see how schedules changed"}</span>
        <span className={`text-gray-500 transition-transform ${open ? "rotate-90" : ""}`}>›</span>
      </button>

      {open && (
        <div className="card mt-3 p-4">
          {n < 2 ? (
            <p className="text-sm text-gray-500">The chart needs at least two fully played weeks.</p>
          ) : (
            <>
              <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Remaining strength of schedule by week">
                {/* horizontal grid + y labels */}
                {ticks.map((t) => (
                  <g key={t}>
                    <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="white" strokeOpacity="0.08" />
                    <text x={PAD.l - 6} y={y(t)} fill="#6a7282" fontSize="11" textAnchor="end" dominantBaseline="central">
                      {fmt(t)}
                    </text>
                  </g>
                ))}
                {/* x labels */}
                {points.map((p, i) => (
                  <text key={p.week} x={x(i)} y={H - 8} fill="#6a7282" fontSize="11" textAnchor="middle">
                    Wk {p.week}
                  </text>
                ))}
                {/* league average */}
                <polyline points={path(avg)} fill="none" stroke="white" strokeOpacity="0.35" strokeDasharray="4 4" />
                {/* one line per selected team */}
                {selected.map((id, k) => (
                  <g key={id}>
                    <polyline points={path(points.map((p) => p.sos[id].sos))} fill="none" stroke={COLORS[k % MAX]} strokeWidth="2.5" strokeLinejoin="round" />
                    {points.map((p, i) => (
                      <circle key={p.week} cx={x(i)} cy={y(p.sos[id].sos)} r="3.5" fill={COLORS[k % MAX]}>
                        <title>
                          {meta[id].abbr} after Wk {p.week}: {fmt(p.sos[id].sos)} ({p.sos[id].left} games left)
                        </title>
                      </circle>
                    ))}
                  </g>
                ))}
              </svg>

              {/* legend: latest value and change since the first point */}
              <div className="mt-3 flex flex-wrap gap-2">
                {selected.map((id, k) => {
                  const first = points[0].sos[id].sos;
                  const lastV = points[n - 1].sos[id].sos;
                  const d = lastV - first;
                  return (
                    <span key={id} className="flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 font-mono text-[11px] tabular-nums text-gray-300">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[k % MAX] }} />
                      {meta[id].abbr} {fmt(lastV)}
                      <span className={d > 0 ? "text-red-400" : "text-green-400"}>
                        {d > 0 ? "▲" : "▼"}
                        {Math.abs(d * 1000).toFixed(0)}
                      </span>
                    </span>
                  );
                })}
                <span className="flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 font-mono text-[11px] text-gray-500">
                  <span className="h-px w-4 border-t border-dashed border-white/50" /> League avg
                </span>
              </div>
            </>
          )}

          {/* team picker */}
          <p className="mb-2 mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">Choose up to {MAX} teams ({selected.length} selected)</p>
          <div className="flex flex-wrap gap-1.5">
            {teams.map((t) => {
              const k = selected.indexOf(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggle(t.id)}
                  title={t.name}
                  aria-pressed={k !== -1}
                  className={`cursor-pointer rounded-lg border p-1 transition ${k === -1 ? "border-white/10 opacity-50 hover:opacity-100" : "bg-white/10"}`}
                  style={k === -1 ? undefined : { borderColor: COLORS[k % MAX] }}>
                  <TeamLogo src={t.logo} size={24} className="h-6 w-6" />
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] leading-snug text-gray-600">
            SOS = combined win % of a team&apos;s remaining opponents, using records at that point. Higher = harder. ▲ means the schedule got tougher since Week {points[0]?.week ?? 1}. Early weeks swing a lot because few games have been played.
          </p>
        </div>
      )}
    </section>
  );
}