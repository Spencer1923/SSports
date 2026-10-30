import TeamLogo from "@/components/TeamLogo";

// groups scoring plays by quarter and renders them as a vertical timeline
export default function ScoringSummary({ plays = [], teams = [] }) {
  if (!plays.length) return null;

  // fallback logo lookup in case a play doesn't carry its own team logo
  const logoById = {};
  teams.forEach((t) => {
    logoById[t.team.id] = t.team.logo;
  });

  // { 1: [plays], 2: [plays], ... }
  const byQuarter = {};
  plays.forEach((p) => {
    const q = p.period?.number || 1;
    if (!byQuarter[q]) byQuarter[q] = [];
    byQuarter[q].push(p);
  });

  return (
    <section className="mb-6 sm:mb-10">
      <h2 className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-2 sm:text-xs sm:mb-3">Scoring Summary</h2>
      <div className="card divide-y divide-white/5">
        {Object.entries(byQuarter).map(([q, list]) => (
          <div key={q} className="p-3 sm:p-4">
            <p className="text-gold font-bold text-[10px] sm:text-xs mb-2 sm:text-sm sm:mb-3">{Number(q) > 4 ? "Overtime" : `Q${q}`}</p>

            {/* timeline: vertical line with a dot per score */}
            <div className="space-y-3 border-l border-white/10 pl-3 sm:space-y-4 sm:pl-4">
              {list.map((p, i) => {
                const isTD = (p.type?.text || "").toLowerCase().includes("touchdown");
                return (
                  <div key={p.id || i} className="relative flex items-start gap-2 sm:gap-3">
                    <span className="absolute -left-[17px] top-1.5 sm:-left-[21px] sm:top-2 w-2 h-2 rounded-full bg-gold" />
                    <TeamLogo src={p.team?.logo || logoById[p.team?.id]} size={28} className="w-5 h-5 sm:w-7 sm:h-7 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`font-bold ${isTD ? "text-gold" : "text-white"}`}>{p.type?.abbreviation || p.type?.text}</span>
                        <span className="text-gray-500 tabular-nums">{p.clock?.displayValue}</span>
                      </div>
                      <p className="text-xs text-gray-300 sm:text-sm">{p.text}</p>
                    </div>
                    {/* running score after this play */}
                    <span className="text-xs font-bold sm:text-sm tabular-nums text-gray-100">
                      {p.awayScore} - {p.homeScore}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
