// shown only during a live game: who has the ball, situation, last play, and a field bar
export default function LiveDriveBanner({ data }) {
  const state = data.header?.competitions?.[0]?.status?.type?.state;
  const drive = data.drives?.current;
  const plays = drive?.plays || [];
  const last = plays[plays.length - 1];
  if (state !== "in" || !drive || !last) return null;

  // yards to the opponent's end zone: 100 = own goal line, 0 = about to score
  const toGo = last.end?.yardsToEndzone ?? last.start?.yardsToEndzone;
  const startToGo = drive.start?.yardsToEndzone;
  const clamp = (n) => Math.min(100, Math.max(0, n));
  const ballPct = toGo == null ? 50 : clamp(100 - toGo);
  const startPct = startToGo == null ? ballPct : clamp(100 - startToGo);

  return (
    <div className="card p-4 mb-8" style={{ borderColor: "rgba(212,175,55,0.5)" }}>
      <div className="flex items-center gap-3 mb-3">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-red-400">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" /> Live
        </span>
        <img src={drive.team?.logos?.[0]?.href || drive.team?.logo} alt="" className="w-7 h-7" />
        <div>
          <p className="text-sm font-bold text-white">{drive.team?.displayName} have the ball</p>
          <p className="text-xs text-gray-400">
            {last.end?.shortDownDistanceText || last.end?.downDistanceText}
            {last.end?.possessionText ? ` · Ball on ${last.end.possessionText}` : ""}
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-300 mb-4">
        <span className="text-gray-500">Last play: </span>
        {last.text}
      </p>

      {/* field: yard lines every 10, gold fill = ground gained this drive, glowing dot = ball */}
      <div
        className="relative h-8 rounded-md overflow-hidden ring-1 ring-white/20 bg-neutral-900"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to right, transparent 0, transparent calc(10% - 1px), rgba(255,255,255,0.12) calc(10% - 1px), rgba(255,255,255,0.12) 10%)",
        }}
      >
        <div
          className="absolute inset-y-0 bg-gold/30"
          style={{ left: `${startPct}%`, width: `${Math.max(ballPct - startPct, 0)}%` }}
        />
        <div
          className="absolute top-1/2 w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold shadow-[0_0_12px_#D4AF37] animate-pulse"
          style={{ left: `${ballPct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-500 mt-1">
        <span>Own goal line</span>
        <span>Opponent end zone →</span>
      </div>
    </div>
  );
}