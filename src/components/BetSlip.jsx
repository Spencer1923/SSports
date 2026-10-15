"use client";
import { useState } from "react";
import { fmtOdds, fromDecimal, toDecimal } from "@/lib/odds";

// dollars with commas and 2 decimals
const money = (n) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function BetSlip({ legs, format, onRemove, onClear }) {
  const [stake, setStake] = useState("10"); // pretend dollars
  const [open, setOpen] = useState(true); // collapse so it doesn't cover the cards

  if (!legs.length) return null;

  const amount = Math.max(0, parseFloat(stake) || 0);
  // a parlay multiplies every leg's decimal odds together
  const combined = legs.reduce((acc, l) => acc * toDecimal(l.odds), 1);
  const payout = amount * combined;
  const profit = payout - amount;
  const impliedProb = 1 / combined; // chance every leg hits, as the odds price it
  const american = fromDecimal(combined);
  const sameGame = new Set(legs.map((l) => l.gameId)).size < legs.length;

  return (
    <aside className="fixed inset-x-3 bottom-3 z-40 overflow-hidden rounded-2xl border border-gold/40 bg-black/85 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-md sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-96">
      {/* header: always visible, click to collapse */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex flex-1 cursor-pointer items-center gap-3 text-left">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-gold">{legs.length > 1 ? `${legs.length}-leg parlay` : "Bet slip"}</span>
          <span className="font-mono text-sm font-bold tabular-nums text-white">{fmtOdds(american, format)}</span>
          <span className="ml-auto text-gray-500">{open ? "▾" : "▴"}</span>
        </button>
        <button onClick={onClear} className="cursor-pointer text-[11px] uppercase tracking-widest text-gray-500 hover:text-white">
          Clear
        </button>
      </div>

      {open && (
        <div className="max-h-[70vh] overflow-y-auto border-t border-white/10">
          {/* the picks */}
          <div className="divide-y divide-white/5">
            {legs.map((l) => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-100">{l.label}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">{l.matchup}</p>
                </div>
                <span className="font-mono text-sm font-bold tabular-nums text-white">{fmtOdds(l.odds, format)}</span>
                <button onClick={() => onRemove(l.id)} aria-label={`Remove ${l.label}`} className="cursor-pointer text-gray-500 hover:text-white">
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* stake + results */}
          <div className="space-y-3 border-t border-white/10 px-4 py-3">
            <label className="flex items-center justify-between gap-3 text-xs uppercase tracking-widest text-gray-400">
              Stake
              <span className="flex items-center rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-sm normal-case tracking-normal text-white">
                $
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  className="ml-1 w-20 bg-transparent text-right tabular-nums focus:outline-none"
                />
              </span>
            </label>

            <div className="grid grid-cols-2 gap-2 text-center">
              {[
                ["Combined odds", fmtOdds(american, format)],
                ["Implied probability", `${(impliedProb * 100).toFixed(1)}%`],
                ["Payout", money(payout)],
                ["Profit", money(profit)],
              ].map(([label, value], i) => (
                <div key={label} className="rounded-lg bg-white/5 px-2 py-2">
                  <p className="text-[10px] uppercase tracking-widest text-gray-500">{label}</p>
                  <p className={`font-mono text-base font-bold tabular-nums ${i === 3 ? "text-gold" : "text-white"}`}>{value}</p>
                </div>
              ))}
            </div>

            <p className="text-[11px] leading-snug text-gray-600">
              Pretend money only. {sameGame && "Legs from the same game are correlated, so real books price them differently. "}
              Implied probability includes the books margin.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
