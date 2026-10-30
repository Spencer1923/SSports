import { Fragment } from "react";
import TeamLogo from "@/components/TeamLogo";

// spread, moneyline, and total for the first provider ESPN lists
export default function BettingLines({ pickcenter = [], home, away }) {
  const pc = pickcenter[0];
  if (!pc) return null;

  const homeOdds = pc.homeTeamOdds || {};
  const awayOdds = pc.awayTeamOdds || {};

  // favorite gets "-", underdog gets "+"; 0 means pick'em
  const spreadAbs = Math.abs(pc.spread ?? 0);
  const fmtSpread = (isFav) => (spreadAbs === 0 ? "PK" : `${isFav ? "-" : "+"}${spreadAbs}`);
  const fmtML = (ml) => {
    const n = Number(ml);
    if (ml == null || Number.isNaN(n)) return "—";
    return n > 0 ? `+${n}` : `${n}`;
  };

  const rows = [
    ["Spread", fmtSpread(awayOdds.favorite), fmtSpread(homeOdds.favorite)],
    ["Moneyline", fmtML(awayOdds.moneyLine), fmtML(homeOdds.moneyLine)],
  ];

  return (
    <section>
      <h2 className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-2 text-[10px] sm:mb-3 sm:text-xs">Betting Lines</h2>
      <div className="card p-3 sm:p-4">
        {/* away on the left, home on the right (same order as the box score header) */}
        <div className="grid grid-cols-3 items-center gap-y-2 text-center sm:gap-y-4">
          <div className="flex flex-col items-center gap-1">
            <TeamLogo src={away?.logo} size={32} className="w-6 h-6 sm:w-8 sm:h-8" />
            <span className="text-[10px] text-gray-400 sm:text-xs">{away?.abbreviation}</span>
          </div>
          <span />
          <div className="flex flex-col items-center gap-1">
            <TeamLogo src={home?.logo} size={32} className="w-6 h-6 sm:w-8 sm:h-8" />
            <span className="text-[10px] text-gray-400 sm:text-xs">{home?.abbreviation}</span>
          </div>

          {rows.map(([label, a, h]) => (
            <Fragment key={label}>
              <span className="text-base font-bold tabular-nums text-white sm:text-xl">{a}</span>
              <span className="text-[9px] uppercase tracking-wider text-gray-500 sm:text-[11px] sm:tracking-widest">{label}</span>
              <span className="text-base font-bold tabular-nums text-white sm:text-xl">{h}</span>
            </Fragment>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-[10px] text-gray-400 sm:mt-4 sm:pt-3 sm:text-xs">
          <span>
            Total (O/U) <b className="text-gold tabular-nums">{pc.overUnder}</b>
          </span>
          <span>{pc.provider?.name}</span>
        </div>
      </div>
    </section>
  );
}
