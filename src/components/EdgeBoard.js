import { marketProb } from "@/lib/odds";
import TeamLogo from "@/components/TeamLogo";

// ranks games by how far ESPN's model is from the market's win probability
export default function EdgeBoard({ games = [] }) {
  const rows = games
    .map((g) => {
      const prob = marketProb(g.lines?.[0]); // market's home win probability, vig removed
      if (prob == null || g.modelHome == null) return null;
      return { g, prob, gap: g.modelHome - prob }; // gap > 0: the model likes home more than the market does
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));

  if (!rows.length) return null;
  const max = Math.max(...rows.map((r) => Math.abs(r.gap)), 0.001); // longest bar = biggest gap

  return (
    <section className="mb-8">
      <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-gray-400">Edge board · model vs market</h2>
      <div className="card divide-y divide-white/5">
        {rows.map(({ g, prob, gap }, i) => {
          // the side the model likes more than the market does
          const pick = gap > 0 ? g.home : g.away;
          const market = gap > 0 ? prob : 1 - prob;
          const model = gap > 0 ? g.modelHome : 1 - g.modelHome;
          const tag = g.state === "post" ? " · FINAL" : g.state === "in" ? " · LIVE" : "";

          return (
            <div key={g.id} className="flex items-center gap-3 px-4 py-3">
              <span className="w-5 font-mono text-xs tabular-nums text-gray-600">{i + 1}</span>
              <TeamLogo src={pick.logo} size={32} className="h-8 w-8 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-100">
                  {pick.name}
                  <span className="ml-2 font-mono text-[11px] font-normal text-gray-500">
                    {g.away.abbr} @ {g.home.abbr}
                    {tag}
                  </span>
                </p>
                {/* bar length = size of the gap, in the team's color */}
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full" style={{ width: `${(Math.abs(gap) / max) * 100}%`, backgroundColor: pick.color || "#D4AF37" }} />
                </div>
              </div>
              <div className="text-right font-mono tabular-nums">
                <p className="text-sm font-bold text-gold">+{(Math.abs(gap) * 100).toFixed(1)}</p>
                <p className="text-[10px] text-gray-500">
                  {Math.round(market * 100)}% → {Math.round(model * 100)}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] leading-snug text-gray-600">
        The team shown is the side ESPNs model likes more than the market does. The number is the gap in win probability points (market → model). It shows disagreement, not a prediction.
      </p>
    </section>
  );
}
