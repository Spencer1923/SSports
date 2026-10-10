"use client";
import { useState } from "react";

// maps a drive result to colors (gold = TD, red = turnover, gray = punt)
function resultStyle(result = "") {
  const r = result.toUpperCase();
  if (r === "TD" || r.includes("TOUCHDOWN")) return { bar: "border-gold", pill: "bg-gold/15 text-gold" };
  if (r.includes("INT") || r.includes("FUMBLE") || r.includes("DOWNS") || r.includes("TURNOVER"))
    return { bar: "border-red-600", pill: "bg-red-900/50 text-red-300" };
  if (r.includes("PUNT")) return { bar: "border-gray-600", pill: "bg-white/10 text-gray-300" };
  return { bar: "border-white/20", pill: "bg-white/5 text-gray-400" };
}

export default function DriveList({ drives }) {
  const [openId, setOpenId] = useState(null); // which drive is expanded

  const previous = drives?.previous || [];
  const current = drives?.current;
  // add the in-progress drive, unless ESPN already lists it in "previous"
  const all = current && !previous.some((d) => d.id === current.id) ? [...previous, current] : previous;
  if (!all.length) return null;

  return (
    <section className="mb-10">
      <h2 className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-3">Drives</h2>
      <div className="card overflow-hidden divide-y divide-white/5">
        {all.map((drive, i) => {
          const id = drive.id ?? i;
          const isOpen = openId === id;
          const style = resultStyle(drive.result || drive.displayResult);

          return (
            <div key={id}>
              {/* one row per drive: logo, team, plays / yards / time, result pill */}
              <button
                onClick={() => setOpenId(isOpen ? null : id)}
                aria-expanded={isOpen}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left border-l-4 ${style.bar} hover:bg-white/5 transition-colors cursor-pointer`}
              >
                <img src={drive.team?.logos?.[0]?.href || drive.team?.logo} alt="" className="w-7 h-7 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-100 truncate">
                    {drive.team?.shortDisplayName || drive.team?.displayName}
                  </p>
                  <p className="text-xs text-gray-500 tabular-nums">
                    {drive.offensivePlays} plays · {drive.yards} yds · {drive.timeElapsed?.displayValue}
                  </p>
                </div>
                <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-full ${style.pill}`}>
                  {drive.shortDisplayResult || drive.displayResult || drive.result || "Live"}
                </span>
                <span className={`text-gray-500 transition-transform ${isOpen ? "rotate-90" : ""}`}>›</span>
              </button>

              {/* expanded: every play in the drive */}
              {isOpen && (
                <div className="bg-black/30 px-4 py-3 space-y-2">
                  {(drive.plays || []).map((play, pi) => (
                    <div key={play.id || pi} className="flex gap-3 text-sm">
                      <span className="w-28 shrink-0 text-xs text-gray-500 tabular-nums pt-0.5">
                        {play.start?.downDistanceText || play.type?.text}
                      </span>
                      <span className="text-gray-300">{play.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}