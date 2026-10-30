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

  // mobile version: one line per team
  const teamLines = [
    [away, fmtSpread(awayOdds.favorite), fmtML(awayOdds.moneyLine)],
    [home, fmtSpread(homeOdds.favorite), fmtML(homeOdds.moneyLine)],
  ];

  return (
    <section>
      <h2 className="mb-1.5 text-[10px] uppercase tracking-[0.2em] text-gray-400 sm:mb-3 sm:text-xs">Betting Lines</h2>
      <div className="card px-3 py-2 sm:p-4">
        {/* MOBILE: compact table */}
        <div className="sm:hidden">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 gap-y-0.5 text-xs">
            <span />
            <span className="text-right text-[9px] uppercase tracking-wider text-gray-500">Spread</span>
            <span className="text-right text-[9px] uppercase tracking-wider text-gray-500">ML</span>
            {teamLines.map(([t, s, m]) => (
              <Fragment key={t?.abbreviation}>
                <span className="flex items-center gap-1.5 text-gray-300">
                  <TeamLogo src={t?.logo} size={20} className="h-4 w-4" />
                  {t?.abbreviation}
                </span>
                <span className="text-right font-bold tabular-nums text-white">{s}</span>
                <span className="text-right font-bold tabular-nums text-white">{m}</span>
              </Fragment>
            ))}
          </div>
          <div className="mt-1.5 flex items-center justify-between border-t border-white/10 pt-1 text-[10px] text-gray-400">
            <span>
              O/U <b className="tabular-nums text-gold">{pc.overUnder}</b>
            </span>
            <span>{pc.provider?.name}</span>
          </div>
        </div>

        {/* DESKTOP: original layout */}
        <div className="hidden sm:block">
          <div className="grid grid-cols-3 items-center gap-y-4 text-center">
            <div className="flex flex-col items-center gap-1">
              <TeamLogo src={away?.logo} size={32} className="h-8 w-8" />
              <span className="text-xs text-gray-400">{away?.abbreviation}</span>
            </div>
            <span />
            <div className="flex flex-col items-center gap-1">
              <TeamLogo src={home?.logo} size={32} className="h-8 w-8" />
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
              Total (O/U) <b className="tabular-nums text-gold">{pc.overUnder}</b>
            </span>
            <span>{pc.provider?.name}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
