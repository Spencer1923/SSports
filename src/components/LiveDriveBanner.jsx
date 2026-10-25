import TeamLogo from "@/components/TeamLogo";

// live field graphic. Left end zone = away team, right end zone = home team.
// Only renders while a game is in progress.
export default function LiveDriveBanner({ data }) {
  const state = data.header?.competitions?.[0]?.status?.type?.state;
  const drive = data.drives?.current;
  const plays = drive?.plays || [];
  const last = plays[plays.length - 1];
  if (state !== "in" || !drive || !last) return null;

  // ---- who is home / away (end-zone colors + which way the offense is moving) ----
  const comps = data.header?.competitions?.[0]?.competitors || [];
  const boxTeams = data.boxscore?.teams || [];
  const info = (c) => {
    const id = c?.team?.id || c?.id;
    const box = boxTeams.find((t) => t.team.id === id)?.team;
    return {
      id,
      abbr: box?.abbreviation || c?.team?.abbreviation || "",
      color: `#${box?.color || c?.team?.color || "444444"}`,
    };
  };
  const away = info(comps.find((c) => c.homeAway === "away"));
  const home = info(comps.find((c) => c.homeAway === "home"));

  // offense team id, with a fallback to matching by abbreviation
  const offId = drive.team?.id || last.end?.team?.id || last.start?.team?.id;
  const offenseIsAway = offId ? offId === away.id : drive.team?.abbreviation ? drive.team.abbreviation === away.abbr : true;
  const dir = offenseIsAway ? 1 : -1; // +1 = moving right, -1 = moving left

  // ---- field math (field runs from x=10 to x=110, end zones are 0-10 and 110-120) ----
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const toGo = last.end?.yardsToEndzone ?? last.start?.yardsToEndzone ?? 50;
  const startToGo = drive.start?.yardsToEndzone ?? toGo;
  const dist = last.end?.distance;

  // yards-to-goal -> x position
  const toX = (yardsToGoal) => 10 + (offenseIsAway ? 100 - yardsToGoal : yardsToGoal);
  const ballX = clamp(toX(toGo), 10, 110);
  const startX = clamp(toX(startToGo), 10, 110);
  const showFirstDown = dist != null && toGo > dist;
  const firstDownX = showFirstDown ? clamp(toX(toGo - dist), 10, 110) : null;

  const inRedZone = toGo <= 20;
  const redZoneX = offenseIsAway ? 90 : 10; // the 20 yards being attacked

  // ---- text bits ----
  const situation = (last.end?.shortDownDistanceText || last.end?.downDistanceText || "").split(" at ")[0];
  const driveText = [`${drive.offensivePlays ?? plays.length} plays`, `${drive.yards ?? 0} yds`, drive.timeElapsed?.displayValue].filter(Boolean).join(" · ");

  const num = { fill: "white", fillOpacity: 0.3, fontSize: 3.2, fontWeight: 700, textAnchor: "middle", dominantBaseline: "central" };
  const zoneText = { fill: "white", fillOpacity: 0.9, fontSize: 4.5, fontWeight: 800, textAnchor: "middle", dominantBaseline: "central", letterSpacing: 0.6 };

  return (
    <div className="card p-4 mb-8" style={{ borderColor: "rgba(212,175,55,0.5)" }}>
      {/* top row: live tag, team with the ball, down & distance */}
      <div className="flex items-center gap-3 mb-3">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-red-400">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" /> Live
        </span>
        <TeamLogo src={drive.team?.logos?.[0]?.href || drive.team?.logo} size={28} className="w-7 h-7" />
        <p className="text-sm font-bold text-white flex-1 min-w-0 truncate">{drive.team?.displayName} ball</p>
        <p className="text-2xl font-extrabold tabular-nums text-gold">{situation}</p>
      </div>

      {/* the field */}
      <svg viewBox="0 0 120 30" className="w-full h-auto rounded-lg ring-1 ring-white/15" role="img" aria-label="Ball position on the field">
        <defs>
          {/* hash marks: two tiny ticks repeated every yard */}
          <pattern id="ld-hash" width="1" height="30" patternUnits="userSpaceOnUse">
            <line x1="0.5" y1="10.6" x2="0.5" y2="12" stroke="white" strokeOpacity="0.2" strokeWidth="0.15" />
            <line x1="0.5" y1="18" x2="0.5" y2="19.4" stroke="white" strokeOpacity="0.2" strokeWidth="0.15" />
          </pattern>
          {/* drive trail fades in from where the drive started */}
          <linearGradient id="ld-drive" x1={dir === 1 ? 0 : 1} x2={dir === 1 ? 1 : 0} y1="0" y2="0">
            <stop offset="0" stopColor="#D4AF37" stopOpacity="0" />
            <stop offset="1" stopColor="#D4AF37" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* turf + alternating mowing stripes */}
        <rect width="120" height="30" fill="#0d1710" />
        {[0, 2, 4, 6, 8].map((i) => (
          <rect key={i} x={10 + i * 10} width="10" height="30" fill="white" fillOpacity="0.03" />
        ))}

        {/* end zones in team colors */}
        <rect x="0" width="10" height="30" fill={away.color} fillOpacity="0.6" />
        <rect x="110" width="10" height="30" fill={home.color} fillOpacity="0.6" />
        <text x="5" y="15" transform="rotate(-90 5 15)" {...zoneText}>
          {away.abbr}
        </text>
        <text x="115" y="15" transform="rotate(90 115 15)" {...zoneText}>
          {home.abbr}
        </text>

        {/* red zone: faint always, brighter when the ball is inside it */}
        <rect x={redZoneX} width="20" height="30" fill="#8B0000" fillOpacity={inRedZone ? 0.4 : 0.14} />

        {/* hash marks + yard lines + yard numbers */}
        <rect x="10" width="100" height="30" fill="url(#ld-hash)" />
        {Array.from({ length: 11 }, (_, i) => (
          <line
            key={i}
            x1={10 + i * 10}
            x2={10 + i * 10}
            y1="0"
            y2="30"
            stroke="white"
            strokeOpacity={i === 0 || i === 10 ? 0.6 : i === 5 ? 0.35 : 0.2}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
          const n = i <= 5 ? i * 10 : (10 - i) * 10; // 10 20 30 40 50 40 30 20 10
          return (
            <g key={i}>
              <text x={10 + i * 10} y="6" {...num}>
                {n}
              </text>
              <text x={10 + i * 10} y="25" {...num}>
                {n}
              </text>
            </g>
          );
        })}

        {/* drive trail */}
        <rect x={Math.min(startX, ballX)} y="12.8" width={Math.abs(ballX - startX)} height="4.4" rx="2.2" fill="url(#ld-drive)" />

        {/* first-down line (gold) and line of scrimmage (white) */}
        {showFirstDown && <line x1={firstDownX} x2={firstDownX} y1="0" y2="30" stroke="#D4AF37" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />}
        <line x1={ballX} x2={ballX} y1="0" y2="30" stroke="#004cff" strokeOpacity="0.8" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />

        {/* arrow showing which way the offense is moving */}
        <polygon points={`${ballX + dir * 3.2},12.8 ${ballX + dir * 3.2},17.2 ${ballX + dir * 5.6},15`} fill="#D4AF37" />

        {/* the ball, with a pulsing ring */}
        <circle cx={ballX} cy="15" r="2" fill="none" stroke="#D4AF37" strokeWidth="1" vectorEffect="non-scaling-stroke">
          <animate attributeName="r" values="2;5.5" dur="1.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0" dur="1.4s" repeatCount="indefinite" />
        </circle>
        <ellipse cx={ballX} cy="15" rx="2.1" ry="1.3" fill="#8a4b1f" stroke="white" strokeWidth="0.25" />
        <line x1={ballX - 0.8} x2={ballX + 0.8} y1="15" y2="15" stroke="white" strokeWidth="0.25" />
      </svg>

      {/* info tiles */}
      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        {[
          ["Ball on", last.end?.possessionText || "—"],
          ["To goal", `${toGo} yds`],
          ["Drive", driveText],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-white/5 py-2 px-1">
            <p className="text-[10px] uppercase tracking-widest text-gray-500">{label}</p>
            <p className="text-sm font-bold text-white tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-300 mt-3">
        <span className="text-gray-500">Last play: </span>
        {last.text}
      </p>
    </div>
  );
}
