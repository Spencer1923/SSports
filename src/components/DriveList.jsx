"use client";
import { useState } from "react";
import TeamLogo from "@/components/TeamLogo";

// maps a drive result to colors (gold = TD, red = turnover, gray = punt)
function resultStyle(result = "") {
  const r = result.toUpperCase();
  if (r === "TD" || r.includes("TOUCHDOWN")) return { bar: "border-gold", pill: "bg-gold/15 text-gold", dot: "bg-gold" };
  if (r.includes("INT") || r.includes("FUMBLE") || r.includes("DOWNS") || r.includes("TURNOVER")) return { bar: "border-red-600", pill: "bg-red-900/50 text-red-300", dot: "bg-red-600" };
  if (r.includes("PUNT")) return { bar: "border-gray-600", pill: "bg-white/10 text-gray-300", dot: "bg-gray-500" };
  return { bar: "border-white/20", pill: "bg-white/5 text-gray-400", dot: "bg-white/20" };
}

export default function DriveList({ drives }) {
  const [open, setOpen] = useState(false); // whole section, collapsed by default
  const [openId, setOpenId] = useState(null); // which single drive is expanded

  const previous = drives?.previous || [];
  const current = drives?.current;
  // add the in-progress drive, unless ESPN already lists it in "previous"
  const all = current && !previous.some((d) => d.id === current.id) ? [...previous, current] : previous;
  if (!all.length) return null;

  return (
    <section className="mb-6 sm:mb-10">
      {/* collapsed header: title, drive count, one colored square per drive */}
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="card w-full flex items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3 text-left cursor-pointer hover:bg-white/5">
        <span className="text-[10px] uppercase tracking-[0.2em] sm:text-xs text-gray-400">Drives</span>
        <span className="text-xs text-gray-500 tabular-nums">{all.length}</span>
        <span className="flex flex-wrap gap-1 flex-1">
          {all.map((d, i) => (
            <span key={d.id ?? i} className={`w-2.5 h-2.5 rounded-sm ${resultStyle(d.result || d.displayResult).dot}`} />
          ))}
        </span>
        <span className={`text-gray-500 transition-transform ${open ? "rotate-90" : ""}`}>›</span>
      </button>

      {open && (
        <div className="card overflow-hidden divide-y divide-white/5 mt-3">
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
                  className={`w-full flex items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3 text-left border-l-4 ${style.bar} hover:bg-white/5 transition-colors cursor-pointer`}>
                  <TeamLogo src={drive.team?.logos?.[0]?.href || drive.team?.logo} size={28} className="w-5 h-5 shrink-0 sm:w-7 sm:h-7" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold sm:text-sm text-gray-100 truncate">{drive.team?.shortDisplayName || drive.team?.displayName}</p>
                    <p className="text-[10px] text-gray-500 sm:text-xs tabular-nums">
                      {drive.offensivePlays} plays · {drive.yards} yds · {drive.timeElapsed?.displayValue}
                    </p>
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 sm:text-[11px] sm:px-2.5 sm:py-1 rounded-full ${style.pill}`}>{drive.shortDisplayResult || drive.displayResult || drive.result || "Live"}</span>
                  <span className={`text-gray-500 transition-transform ${isOpen ? "rotate-90" : ""}`}>›</span>
                </button>

                {/* expanded: every play in the drive */}
                {isOpen && (
                  <div className="bg-black/30 px-3 py-2 space-y-1.5 sm:px-4 sm:py-3 sm:space-y-2">
                    {(drive.plays || []).map((play, pi) => (
                      <div key={play.id || pi} className="flex gap-2 text-xs sm:gap-3 sm:text-sm">
                        <span className="w-20 shrink-0 text-[10px] sm:w-28 sm:text-xs text-gray-500 tabular-nums pt-0.5">{play.start?.downDistanceText || play.type?.text}</span>
                        <span className="text-gray-300">{play.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
