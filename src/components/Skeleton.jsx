// placeholder shapes that mimic the real layout while data loads (animate-pulse = built-in Tailwind fade)

// a small gray block; pass width/height classes through `className`
const Bar = ({ className = "" }) => <div className={`rounded bg-white/10 ${className}`} />;

// page wrapper with the same padding as real pages; `bare` skips it when the page already has one
const Wrap = ({ bare, children }) => (
  <div className={`animate-pulse ${bare ? "" : "mx-auto max-w-7xl px-4 py-8 sm:px-6"}`} aria-busy="true" aria-label="Loading">
    {children}
  </div>
);

// variants:
//   scores = game cards (scoreboard)
//   rows   = one stacked list
//   grid   = a full page of 2-column cards (standings, injuries, playoffs, betting); hero = big banner on top
//   detail = banner + stacked sections (game, team, player pages)
export default function Skeleton({ variant = "scores", count = 6, rows = 4, hero = false, bare = false }) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (variant === "rows") {
    return (
      <div className="card animate-pulse divide-y divide-white/5" aria-busy="true" aria-label="Loading">
        {items.map((i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2">
            <Bar className="h-8 w-8 rounded-full" />
            <Bar className="h-4 flex-1" />
            <Bar className="h-4 w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <Wrap bare={bare}>
        {/* page title, or a big header banner when `hero` is set */}
        {hero ? <div className="mb-8 h-36 rounded-2xl border border-white/10 bg-white/5" /> : <Bar className="mb-6 h-9 w-48" />}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((i) => (
            <div key={i} className="card divide-y divide-white/5 overflow-hidden">
              <div className="bg-white/5 px-3 py-3">
                <Bar className="h-4 w-32" />
              </div>
              {Array.from({ length: rows }, (_, r) => (
                <div key={r} className="flex items-center gap-3 px-3 py-2">
                  <Bar className="h-7 w-7 rounded-full" />
                  <Bar className="h-4 flex-1" />
                  <Bar className="h-4 w-10" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </Wrap>
    );
  }

  if (variant === "detail") {
    return (
      <Wrap bare={bare}>
        <div className="h-28 rounded-xl border border-white/10 bg-white/5" />
        <div className="mt-8 space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-40" />
          ))}
        </div>
      </Wrap>
    );
  }

  // scores: same padding and row sizes as a real game card, so the layout doesn't shift
  return (
    <div className="grid animate-pulse gap-3" aria-busy="true" aria-label="Loading">
      {items.map((i) => (
        <div key={i} className="card p-3">
          <Bar className="mb-3 h-3 w-28" />
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bar className="h-6 w-6 rounded-full" />
              <Bar className="h-4 w-24" />
            </div>
            <Bar className="h-5 w-7" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bar className="h-6 w-6 rounded-full" />
              <Bar className="h-4 w-20" />
            </div>
            <Bar className="h-5 w-7" />
          </div>
        </div>
      ))}
    </div>
  );
}