// placeholder shapes that mimic the real layout while data loads (animate-pulse = built-in Tailwind fade)

// a small gray block; pass width/height classes through `className`
const Bar = ({ className = "" }) => <div className={`rounded bg-white/10 ${className}`} />;

// variant="scores": cards shaped like the scoreboard game cards
// variant="rows": a stacked list of rows, handy for standings/tables later
export default function Skeleton({ variant = "scores", count = 6 }) {
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

  // scores: same padding and row sizes as a real game card, so the layout doesn't shift
  return (
    <div className="grid animate-pulse gap-3" aria-busy="true" aria-label="Loading">
      {items.map((i) => (
        <div key={i} className="card p-3">
          <Bar className="mb-3 h-3 w-28" /> {/* status line */}
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