// win probability over the course of the game, as a two-tone area chart (pure SVG, no library)
export default function WinProbability({ plays = [], home, away }) {
  if (plays.length < 2) return null;

  const homeColor = `#${home?.color || "D4AF37"}`;
  const awayColor = `#${away?.color || "8B0000"}`;

  // ESPN gives 0–1; normalize in case it ever sends 0–100
  const frac = (v) => (v > 1 ? v / 100 : v ?? 0.5);

  // chart is 100 wide x 40 tall; top = home certain to win, bottom = away certain to win
  const pts = plays.map((p, i) => [
    (i / (plays.length - 1)) * 100,
    40 - frac(p.homeWinPercentage) * 40,
  ]);
  const line = pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `M0,20 ${pts.map(([x, y]) => `L${x.toFixed(2)},${y.toFixed(2)}`).join(" ")} L100,20 Z`;

  const homePct = Math.round(frac(plays[plays.length - 1].homeWinPercentage) * 100);

  return (
    <section>
      <h2 className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-3">Win Probability</h2>
      <div className="card p-4">
        {/* current odds for each team */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <img src={home?.logo} alt="" className="w-6 h-6" />
            <span className="text-2xl font-extrabold tabular-nums text-white">{homePct}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold tabular-nums text-white">{100 - homePct}%</span>
            <img src={away?.logo} alt="" className="w-6 h-6" />
          </div>
        </div>

        <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-40 rounded-md bg-black/30">
          <defs>
            <clipPath id="wp-top"><rect x="0" y="0" width="100" height="20" /></clipPath>
            <clipPath id="wp-bottom"><rect x="0" y="20" width="100" height="20" /></clipPath>
          </defs>
          {/* area above the midline is home's color, below is away's */}
          <path d={area} fill={homeColor} fillOpacity="0.6" clipPath="url(#wp-top)" />
          <path d={area} fill={awayColor} fillOpacity="0.6" clipPath="url(#wp-bottom)" />
          <line x1="0" y1="20" x2="100" y2="20" stroke="white" strokeOpacity="0.3" strokeDasharray="4 4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <polyline points={line} fill="none" stroke="white" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-500 mt-1">
          <span>Kickoff</span>
          <span>Now / Final</span>
        </div>
      </div>
    </section>
  );
}