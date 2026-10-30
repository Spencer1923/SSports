import TeamLogo from "@/components/TeamLogo";
import { useEffect, useRef, useState } from "react";

// three small dots: gold = timeout left, dim = timeout used
function TimeoutDots({ left }) {
  return (
    <span className="flex gap-1" title={`${left} timeouts left`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={`h-2 w-2 rounded-full ${i < left ? "bg-gold" : "bg-white/15"}`} />
      ))}
    </span>
  );
}

// live field graphic. Left end zone = away team, right end zone = home team.
// Only renders while a game is in progress.
export default function LiveDriveBanner({ data }) {
  // pulse = true for 1.5 seconds after either team's score changes
  const [pulse, setPulse] = useState(false);
  const prevTotal = useRef(null); // the last combined score we saw (null = first load)
  const scoreTotal = (data.header?.competitions?.[0]?.competitors || []).reduce((sum, c) => sum + (Number(c.score) || 0), 0);

  useEffect(() => {
    // only pulse if we already had a score to compare against (so no pulse on page load)
    if (prevTotal.current !== null && prevTotal.current !== scoreTotal) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 1500);
      prevTotal.current = scoreTotal;
      return () => clearTimeout(timer); // cancel the old timer if the score changes again
    }
    prevTotal.current = scoreTotal;
  }, [scoreTotal]);
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

  // timeouts left = 3 minus timeouts used (null if ESPN didn't send the number)
  const timeoutsLeft = (side) => {
    const used = comps.find((c) => c.homeAway === side)?.timeoutsUsed;
    return used != null ? Math.max(0, 3 - used) : null;
  };
  const awayTO = timeoutsLeft("away");
  const homeTO = timeoutsLeft("home");

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

  // a penalty play has type id "8" in ESPN's data; the text check is a backup
  // trim() removes leading spaces, since ESPN's play text sometimes starts with one
  const lastWasPenalty = last.type?.id === "8" || /^penalty/i.test((last.text || "").trim());
  const inRedZone = toGo <= 20;
  const redZoneX = offenseIsAway ? 90 : 10; // the 20 yards being attacked

  // ---- text bits ----
  const situation = (last.end?.shortDownDistanceText || last.end?.downDistanceText || "").split(" at ")[0];
  const driveText = [`${drive.offensivePlays ?? plays.length} plays`, `${drive.yards ?? 0} yds`, drive.timeElapsed?.displayValue].filter(Boolean).join(" · ");

  const num = { fill: "white", fillOpacity: 0.3, fontSize: 3.2, fontWeight: 700, textAnchor: "middle", dominantBaseline: "central" };
  const zoneText = { fill: "white", fillOpacity: 0.9, fontSize: 4.5, fontWeight: 800, textAnchor: "middle", dominantBaseline: "central", letterSpacing: 0.6 };

  return (
    <div
      className="card -mx-4 mb-5 rounded-none border-x-0 px-0 py-2 sm:mx-0 sm:mb-8 sm:rounded-xl sm:border-x sm:p-4"
      // inline styles because .card is unlayered CSS; the border and glow turn crimson inside the 20
      style={{
        // gold pulse wins over the red zone glow while it's showing
        borderColor: pulse ? "rgba(212,175,55,1)" : inRedZone ? "rgba(220,38,38,0.7)" : "rgba(212,175,55,0.5)",
        boxShadow: pulse ? "0 0 36px rgba(212,175,55,0.85)" : inRedZone ? "0 0 24px rgba(139,0,0,0.55)" : undefined,
        transition: "box-shadow 0.5s, border-color 0.5s",
      }}>
      {/* top row: live tag, team with the ball, down & distance */}
      <div className="flex items-center gap-2 mb-2 px-3 sm:px-0 sm:gap-3 sm:mb-3">
        <span className="flex items-center gap-1.5 text-[9px] sm:text-[11px] font-bold uppercase tracking-widest text-red-400">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" /> Live
        </span>
        <TeamLogo src={drive.team?.logos?.[0]?.href || drive.team?.logo} size={28} className="w-7 h-7" />
        <p className="text-xs font-bold text-white flex-1 min-w-0 truncate sm:text-sm">{drive.team?.displayName} ball</p>
        <p className="text-xs font-bold tabular-nums text-white sm:text-2xl sm:font-extrabold">{situation}</p>
      </div>

      {/* the field, mobile height is h-[120px]*/}
      <svg viewBox="0 0 120 30" className="h-[120px] w-full ring-1 ring-white/15 sm:h-auto sm:rounded-lg" role="img" aria-label="Ball position on the field">
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
          {/* red zone glow: transparent at the 20, strongest at the goal line */}
          <linearGradient id="ld-redzone" x1={offenseIsAway ? 0 : 1} x2={offenseIsAway ? 1 : 0} y1="0" y2="0">
            <stop offset="0" stopColor="#DC2626" stopOpacity="0" />
            <stop offset="1" stopColor="#DC2626" stopOpacity="0.55" />
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
        {/* faint red zone tint, always visible */}
        <rect x={redZoneX} width="20" height="30" fill="#8B0000" fillOpacity="0.14" />
        {/* pulsing glow, only while the ball is inside the 20 */}
        {inRedZone && (
          <rect x={redZoneX} width="20" height="30" fill="url(#ld-redzone)">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.6s" repeatCount="indefinite" />
          </rect>
        )}

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
        {/* everything that marks the ball sits in one group. We draw it at x=0 and
            slide the whole group to ballX, so CSS can animate the move between plays */}
        <g style={{ transform: `translateX(${ballX}px)`, transition: "transform 1.2s ease-out" }}>
          {/* line of scrimmage */}
          <line x1="0" x2="0" y1="0" y2="30" stroke="#004cff" strokeOpacity="0.8" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />

          {/* arrow showing which way the offense is moving */}
          <polygon points={`${dir * 3.2},12.8 ${dir * 3.2},17.2 ${dir * 5.6},15`} fill="#D4AF37" />

          {/* the ball, with a pulsing ring */}
          <circle cx="0" cy="15" r="2" fill="none" stroke="#D4AF37" strokeWidth="1" vectorEffect="non-scaling-stroke">
            <animate attributeName="r" values="2;5.5" dur="1.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0" dur="1.4s" repeatCount="indefinite" />
          </circle>
          <ellipse cx="0" cy="15" rx="2.1" ry="1.3" fill="#8a4b1f" stroke="white" strokeWidth="0.25" />
          <line x1="-0.8" x2="0.8" y1="15" y2="15" stroke="white" strokeWidth="0.25" />
        </g>
      </svg>

      {/* timeout dots: away on the left, home on the right, matching the end zones */}
      {awayTO != null && homeTO != null && (
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500">{away.abbr}</span>
            <TimeoutDots left={awayTO} />
          </div>
          <div className="flex items-center gap-2">
            <TimeoutDots left={homeTO} />
            <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500">{home.abbr}</span>
          </div>
        </div>
      )}

      {/* info tiles */}
      <div className="grid grid-cols-3 px-3 sm:px-0 gap-1.5 mt-2 text-center sm:gap-2 sm:mt-3">
        {[
          ["Ball on", last.end?.possessionText || "—"],
          ["To goal", `${toGo} yds`],
          ["Drive", driveText],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-white/5 py-1 px-1 sm:py-2">
            <p className="text-[8px] sm:text-[10px] uppercase tracking-widest text-gray-500">{label}</p>
            <p className="text-[11px] font-bold text-white tabular-nums sm:text-sm">{value}</p>
          </div>
        ))}
      </div>

      <p className="text-[11px] px-3 sm:px-0text-gray-300 mt-2 sm:text-sm sm:mt-3">
        {/* yellow flag pill, only when the last play was a penalty */}
        {lastWasPenalty && <span className="mr-2 rounded-full border border-yellow-400/50 bg-yellow-400/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-yellow-300">🚩 Flag</span>}
        <span className="text-gray-500">Last play: </span>
        {last.text}
      </p>
    </div>
  );
}
