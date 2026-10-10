import { Fragment } from "react";

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
      <h2 className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-3">Betting Lines</h2>
      <div className="card p-4">
        {/* away on the left, home on the right (same order as the box score header) */}
        <div className="grid grid-cols-3 items-center gap-y-4 text-center">
          <div className="flex flex-col items-center gap-1">
            <img src={away?.logo} alt="" className="w-8 h-8" />
            <span className="text-xs text-gray-400">{away?.abbreviation}</span>
          </div>
          <span />
          <div className="flex flex-col items-center gap-1">
            <img src={home?.logo} alt="" className="w-8 h-8" />
            <span className="text-xs text-gray-400">{home?.abbreviation}</span>
          </div>

          {rows.map(([label, a, h]) => (
            <Fragment key={label}>
              <span className="text-xl font-bold tabular-nums text-white">{a}</span>
              <span className="text-[11px] uppercase tracking-widest text-gray-500">{label}</span>
              <span className="text-xl font-bold tabular-nums text-white">{h}</span>
            </Fragment>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-gray-400">
          <span>
            Total (O/U) <b className="text-gold tabular-nums">{pc.overUnder}</b>
          </span>
          <span>{pc.provider?.name}</span>
        </div>
      </div>
    </section>
  );
}