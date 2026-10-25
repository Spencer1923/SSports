"use client";
import { useEffect, useState } from "react";
import useSWR, { preload } from "swr"; // preload = fetch a key early and stash it in SWR's cache
import { useRouter, useSearchParams } from "next/navigation";
import Skeleton from "@/components/Skeleton";
import BetSlip from "@/components/BetSlip";
import EdgeBoard from "@/components/EdgeBoard";
import { fmtOdds, marketProb } from "@/lib/odds";
import TeamLogo from "@/components/TeamLogo";
import Link from "next/link";

const fetcher = (url) => fetch(url).then((res) => res.json());

// ---------- formatting + math helpers ----------
const fmtSpread = (n) => (n == null ? "—" : n === 0 ? "PK" : n > 0 ? `+${n}` : `${n}`);
// color for an injury status pill
const statusTone = (s = "") => {
  const t = s.toLowerCase();
  if (t.includes("out") || t.includes("reserve")) return "bg-red-900/60 text-red-300";
  if (t.includes("doubtful")) return "bg-orange-900/60 text-orange-300";
  return "bg-yellow-900/50 text-yellow-300";
};

// expected final score from the spread + total
function impliedScore(line) {
  if (line?.total == null || line?.homeSpread == null) return null;
  return { home: (line.total - line.homeSpread) / 2, away: (line.total + line.homeSpread) / 2 };
}

// for finished games: who covered, and over/under
function settle(game, line) {
  if (game.state !== "post" || !line) return null;
  const h = Number(game.home.score);
  const a = Number(game.away.score);
  if (Number.isNaN(h) || Number.isNaN(a)) return null;
  let cover = null;
  if (line.homeSpread != null) {
    const m = h + line.homeSpread - a; // > 0 means home covered
    cover = m === 0 ? "Push" : m > 0 ? game.home.abbr : game.away.abbr;
  }
  let ou = null;
  if (line.total != null) {
    const t = h + a;
    ou = t === line.total ? "Push" : t > line.total ? "Over" : "Under";
  }
  return { cover, ou };
}

// one pill in the odds grid; becomes a button when onClick is passed
function Cell({ main, sub, accent, onClick, selected }) {
  const tone = selected ? "border-white/70 bg-white/15" : accent ? "border-gold/40 bg-gold/10" : "border-white/10 bg-white/5";
  const base = `min-w-[50px] sm:min-w-[62px] rounded-md border px-1.5 py-1 text-center font-mono tabular-nums ${tone}`;
  const body = (
    <>
      <p className="text-[13px] font-bold leading-tight text-white">{main}</p>
      {sub != null && <p className="text-[9px] leading-tight text-gray-500">{sub}</p>}
    </>
  );

  if (!onClick) return <div className={base}>{body}</div>;
  return (
    <button onClick={onClick} aria-pressed={!!selected} className={`${base} cursor-pointer transition hover:border-white/40 hover:bg-white/10`}>
      {body}
    </button>
  );
}

// ---------- one game ----------
function GameCard({ g, slip, toggleLeg, format }) {
  const [open, setOpen] = useState(false); // "compare books" panel
  const line = g.lines[0]; // primary book
  const fmtML = (n) => fmtOdds(n, format); // every price on this card follows the chosen format
  const matchup = `${g.away.abbr} @ ${g.home.abbr}`;
  const canBet = g.state === "pre"; // picks can only be added before kickoff
  const prob = marketProb(line);
  const score = impliedScore(line);
  const result = settle(g, line);
  const started = g.state !== "pre";
  const awayColor = g.away.color || "#8B0000";
  const homeColor = g.home.color || "#D4AF37";
  const delta = g.modelHome != null && prob != null ? g.modelHome - prob : null;
  // the side the ESPN model likes at least 3 pts more than the market (null if no real disagreement)
  const edge = delta != null && Math.abs(delta) >= 0.03 ? (delta > 0 ? "home" : "away") : null;
  // weather text for the chip, e.g. "72°F / 22°C · Clear · Wind 8 mph · 20% rain"
  const w = g.weather;
  const weatherText = !w
    ? null
    : w.indoor
      ? "Dome · weather doesn't matter"
      : [
          w.temp != null && `${Math.round(w.temp)}°F / ${Math.round(((w.temp - 32) * 5) / 9)}°C`,
          w.condition,
          w.wind != null && `Wind ${Math.round(w.wind)} mph`,
          w.rain > 0 && `${Math.round(w.rain)}% rain`,
        ]
          .filter(Boolean)
          .join(" · ");

  // line movement chips (only when ESPN supplies opening numbers)
  const moves = [];
  if (line?.openHomeSpread != null && line.homeSpread != null && line.openHomeSpread !== line.homeSpread)
    moves.push(`Spread ${g.home.abbr} ${fmtSpread(line.openHomeSpread)} → ${fmtSpread(line.homeSpread)}`);
  if (line?.openTotal != null && line.total != null && line.openTotal !== line.total) moves.push(`Total ${line.openTotal} → ${line.total}`);

  const status =
    g.state === "in" ? (
      <span className="flex items-center gap-1.5 text-red-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> LIVE · {g.detail}
      </span>
    ) : g.state === "post" ? (
      <span className="text-gray-400">FINAL</span>
    ) : (
      <span className="text-gray-400">{new Date(g.date).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
    );

  // one team row of the grid (plain function, not a component, so nothing remounts)
  const renderRow = (t, isHome) => {
    const spread = isHome ? line?.homeSpread : line?.homeSpread == null ? null : -line.homeSpread;
    const spreadOdds = isHome ? line?.homeSpreadOdds : line?.awaySpreadOdds;
    const ml = isHome ? line?.homeML : line?.awayML;
    const ats = isHome ? g.atsHome : g.atsAway;
    const side = isHome ? "home" : "away";
    const covered = result?.cover === t.abbr; // finished game: this team covered the spread
    const hitTotal = result?.ou === (isHome ? "Under" : "Over"); // finished game: this total result hit
    // clicking a cell adds or removes that pick (needs a price, and only before kickoff)
    const bet = (market, label, odds) => {
      if (!canBet || odds == null) return {};
      const id = `${g.id}-${market}-${side}`;
      return {
        selected: slip.some((l) => l.id === id),
        onClick: () => toggleLeg({ id, gameId: g.id, market, label, matchup, odds }),
      };
    };
    return (
      <div key={t.id} className="contents">
        <div className="flex min-w-0 items-center gap-3">
          <TeamLogo src={t.logo} size={28} className="h-7 w-7 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-100">
              <Link href={`/teams/${t.id}`} className="hover:text-gold">
                <span className="sm:hidden">{t.abbr}</span>
                <span className="hidden sm:inline">{t.name}</span>
              </Link>
            </p>
            <p className="font-mono text-[10px] text-gray-500">{[t.record, ats && `ATS ${ats}`].filter(Boolean).join(" · ")}</p>
          </div>
          {started && <span className="ml-auto pl-2 font-mono text-lg font-bold tabular-nums text-white">{t.score}</span>}
        </div>
        <Cell main={fmtSpread(spread)} sub={fmtML(spreadOdds)} accent={covered} {...bet("spread", `${t.abbr} ${fmtSpread(spread)}`, spreadOdds)} />
        <Cell main={fmtML(ml)} accent={g.state === "pre" && edge === side} {...bet("ml", `${t.abbr} ML`, ml)} />
        <Cell
          main={`${isHome ? "U" : "O"} ${line?.total ?? "—"}`}
          sub={fmtML(isHome ? line?.underOdds : line?.overOdds)}
          accent={hitTotal}
          {...bet("total", `${isHome ? "Under" : "Over"} ${line?.total}`, isHome ? line?.underOdds : line?.overOdds)}
        />
      </div>
    );
  };

  // best moneyline price per side across books (higher payout wins)
  const bestAway = Math.max(...g.lines.map((l) => l.awayML ?? -Infinity));
  const bestHome = Math.max(...g.lines.map((l) => l.homeML ?? -Infinity));

  return (
    <div className="card relative overflow-hidden p-3 sm:p-4">
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

      <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.15em]">
        {status}
        <span className="text-gray-600">
          {g.away.abbr} @ {g.home.abbr}
        </span>
      </div>

      {/* odds grid: team | spread | moneyline | total */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-x-1.5 gap-y-1">
        <span />
        {["Spread", "Money", "Total"].map((h) => (
          <span key={h} className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
            {h}
          </span>
        ))}
        {renderRow(g.away, false)}
        {renderRow(g.home, true)}
      </div>
      {!line && <p className="mt-3 text-center text-xs text-gray-500">Lines not posted yet</p>}
      {g.state === "pre" && edge && (
        <p className="mt-2 hidden text-center font-mono text-[10px] text-gray-500 sm:block">Gold moneyline = the ESPN model rates this team 3+ pts higher than the market</p>
      )}

      {/* market win probability, with a tick for ESPN's model */}
      {prob != null && (
        <div className="mt-3">
          <div className="flex justify-between font-mono text-[11px] tabular-nums text-gray-300">
            <span>
              {g.away.abbr} {Math.round((1 - prob) * 100)}%
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Market win probability</span>
            <span>
              {Math.round(prob * 100)}% {g.home.abbr}
            </span>
          </div>
          <div className="relative mt-1">
            <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
              <div style={{ width: `${(1 - prob) * 100}%`, backgroundColor: awayColor }} />
              <div style={{ width: `${prob * 100}%`, backgroundColor: homeColor }} />
            </div>
            {g.modelHome != null && <span className="absolute -top-1 h-4 w-0.5 rounded bg-white shadow-[0_0_6px_white]" style={{ left: `${(1 - g.modelHome) * 100}%` }} title="ESPN model" />}
          </div>
          {delta != null && (
            <p className="mt-1 text-center font-mono text-[10px] text-gray-500">
              ESPN model: {g.home.abbr} {Math.round(g.modelHome * 100)}% ·{" "}
              <span className={delta > 0 ? "text-green-400" : "text-red-400"}>
                {delta > 0 ? "+" : ""}
                {(delta * 100).toFixed(1)} pts vs market
              </span>
            </p>
          )}
        </div>
      )}

      {/* telemetry chips */}
      <div className="mt-3 flex flex-wrap gap-1 font-mono text-[9px] tabular-nums">
        {weatherText && <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-gray-300">{weatherText}</span>}
        {score && (
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-300">
            Implied score {g.away.abbr} {score.away.toFixed(1)} – {score.home.toFixed(1)} {g.home.abbr}
          </span>
        )}
        {moves.map((m) => (
          <span key={m} className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-gold">
            {m}
          </span>
        ))}
        {result?.cover && <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-200">Covered: {result.cover}</span>}
        {result?.ou && <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-200">{result.ou}</span>}
      </div>

      {/* key injuries per the depth chart: starters, the backup QB, and backups behind an injured starter */}
      {(g.injuriesAway?.length > 0 || g.injuriesHome?.length > 0) && (
        <details className="group mt-3 rounded-lg border border-white/10 bg-white/[0.02] text-[0.8em]">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-gray-500 hover:text-white [&::-webkit-details-marker]:hidden">
            <span>Key injuries ({(g.injuriesAway?.length || 0) + (g.injuriesHome?.length || 0)})</span>
            <span className="transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="grid grid-cols-1 gap-4 px-3 pb-2 pt-1 sm:grid-cols-2">
            {[
              [g.away, g.injuriesAway || [], g.hiddenAway || 0],
              [g.home, g.injuriesHome || [], g.hiddenHome || 0],
            ].map(([t, list, hidden]) => (
              <div key={t.id}>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-300">
                  <TeamLogo src={t.logo} size={16} className="h-4 w-4" />
                  {t.abbr}
                </p>
                {list.length === 0 && <p className="text-[11px] text-gray-600">No key players listed</p>}
                {list.map((i) => (
                  <p key={i.name} className="flex items-center gap-1.5 py-0 text-[10px] text-gray-500">
                    <span className="w-20 shrink-0 font-mono text-[9px] text-gray-600">{i.role}</span>
                    <Link href={`/players/${i.id}`} className="truncate hover:text-gold">
                      {i.name}
                    </Link>
                    <span className={`ml-auto shrink-0 rounded-full px-1.5 py-0 text-[8px] font-bold uppercase ${statusTone(i.status)}`}>{i.status}</span>
                  </p>
                ))}
                {hidden > 0 && <p className="mt-1 text-[10px] text-gray-600">+{hidden} depth / special teams hidden</p>}
              </div>
            ))}
          </div>
          <p className="hidden px-3 pb-3 text-[10px] leading-snug text-gray-600 sm:block">
            Starters and 2nd-string players on ESPNs depth chart, plus anyone next in line when the players ahead of him are hurt.
          </p>
        </details>
      )}

      {/* footer: source + compare books */}
      {line && (
        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-[10px] text-gray-600">
          {g.lines.length > 1 && (
            <button onClick={() => setOpen(!open)} aria-expanded={open} className="cursor-pointer text-gold hover:text-white">
              Compare {g.lines.length} books {open ? "▴" : "▾"}
            </button>
          )}
        </div>
      )}

      {open && (
        <div className="mt-3 overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full font-mono text-xs tabular-nums">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-gray-500">
                <th className="px-3 py-2 text-left">Book</th>
                <th className="px-3 py-2">{g.home.abbr} spread</th>
                <th className="px-3 py-2">{g.away.abbr} ML</th>
                <th className="px-3 py-2">{g.home.abbr} ML</th>
                <th className="px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-center text-gray-300">
              {g.lines.map((l, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-left text-gray-400">{l.provider}</td>
                  <td className="px-3 py-2">{fmtSpread(l.homeSpread)}</td>
                  <td className={`px-3 py-2 ${l.awayML === bestAway ? "font-bold text-gold" : ""}`}>{fmtML(l.awayML)}</td>
                  <td className={`px-3 py-2 ${l.homeML === bestHome ? "font-bold text-gold" : ""}`}>{fmtML(l.homeML)}</td>
                  <td className="px-3 py-2">{l.total ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------- the page ----------
export default function BettingBoard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const week = searchParams.get("week") ? Number(searchParams.get("week")) : null;
  const [sort, setSort] = useState("time"); // time | spread | total
  const [slip, setSlip] = useState([]); // picks on the bet slip
  // american | decimal | fractional | implied. The saved choice is read once, when the state is created
  const [format, setFormat] = useState(() => {
    try {
      return localStorage.getItem("oddsFormat") || "american";
    } catch {
      return "american"; // on the server there's no localStorage
    }
  });

  // switch the odds format and remember it for next visit
  const changeFormat = (f) => {
    setFormat(f);
    try {
      localStorage.setItem("oddsFormat", f);
    } catch {}
  };

  // spread and moneyline share ONE slot per game (both pick a winner); the total has its own slot
  const slotOf = (l) => `${l.gameId}-${l.market === "total" ? "total" : "side"}`;

  // click a cell to add the pick, click again to remove it, or replace the other pick in the same slot
  const toggleLeg = (leg) => setSlip((prev) => (prev.some((l) => l.id === leg.id) ? prev.filter((l) => l.id !== leg.id) : [...prev.filter((l) => slotOf(l) !== slotOf(leg)), leg]));

  const { data, error, isLoading } = useSWR(week ? `/api/betting?week=${week}` : "/api/betting", fetcher, {
    keepPreviousData: true, // keep showing the old week while the new one loads
    // lines move while games are live (30s) or upcoming (2 min); finished weeks never change
    refreshInterval: (d) => {
      const states = (d?.games || []).map((g) => g.state);
      if (states.includes("in")) return 30000;
      if (states.includes("pre")) return 120000;
      return 0;
    },
  });

  if (error || data?.error) return <p>Failed to load odds.</p>;
  // with keepPreviousData, isLoading stays true during a week switch, so check data instead
  if (!data) return <Skeleton variant="grid" hero bare count={4} rows={4} />;

  const games = data.games || [];
  const currentWeek = week ?? data.week ?? 1;

  // sorting
  const sorted = [...games].sort((a, b) => {
    const la = a.lines[0];
    const lb = b.lines[0];
    if (sort === "spread") return Math.abs(lb?.homeSpread ?? -1) - Math.abs(la?.homeSpread ?? -1);
    if (sort === "total") return (lb?.total ?? -1) - (la?.total ?? -1);
    return new Date(a.date) - new Date(b.date);
  });

  // ---- market signals ----
  const rows = games.filter((g) => g.lines[0]).map((g) => ({ g, l: g.lines[0] }));
  const best = (arr, score) => arr.reduce((b, x) => (b == null || score(x) > score(b) ? x : b), null);
  const maxML = (r) => Math.max(r.l.homeML ?? -Infinity, r.l.awayML ?? -Infinity);
  const withSpread = rows.filter((r) => r.l.homeSpread != null);
  const withTotal = rows.filter((r) => r.l.total != null);

  const fav = best(withSpread, (r) => Math.abs(r.l.homeSpread));
  const close = best(withSpread, (r) => -Math.abs(r.l.homeSpread));
  const hot = best(withTotal, (r) => r.l.total);
  const low = best(withTotal, (r) => -r.l.total);
  const dog = best(
    rows.filter((r) => maxML(r) > 0),
    maxML,
  );

  const matchup = (r) => `${r.g.away.abbr} @ ${r.g.home.abbr}`;
  const bothLogos = (r) => [r.g.away.logo, r.g.home.logo];
  const tiles = [
    fav && {
      label: "Biggest favorite",
      value: `-${Math.abs(fav.l.homeSpread)}`,
      sub: `${fav.l.homeSpread <= 0 ? fav.g.home.abbr : fav.g.away.abbr} · ${matchup(fav)}`,
      logos: [fav.l.homeSpread <= 0 ? fav.g.home.logo : fav.g.away.logo],
    },
    hot && { label: "Highest total", value: hot.l.total, sub: matchup(hot), logos: bothLogos(hot) },
    low && { label: "Lowest total", value: low.l.total, sub: matchup(low), logos: bothLogos(low) },
    close && {
      label: "Closest game",
      value: fmtSpread(Math.abs(close.l.homeSpread)),
      sub: matchup(close),
      logos: bothLogos(close),
    },
    dog && {
      label: "Biggest underdog",
      value: fmtOdds(maxML(dog), format),
      sub: `${dog.l.homeML > dog.l.awayML ? dog.g.home.abbr : dog.g.away.abbr} · ${matchup(dog)}`,
      logos: [dog.l.homeML > dog.l.awayML ? dog.g.home.logo : dog.g.away.logo],
    },
  ].filter(Boolean);

  const SORTS = [
    ["time", "Kickoff"],
    ["spread", "Biggest spread"],
    ["total", "Highest total"],
  ];
  const btn = "cursor-pointer rounded-full border border-white/15 px-4 py-1.5 text-sm text-gray-300 transition hover:border-crimson hover:text-white";

  return (
    <div>
      {/* mission-control header */}
      <header
        className="relative mb-4 overflow-hidden rounded-2xl border border-white/10 p-4 sm:mb-8 sm:p-8"
        style={{
          background: "radial-gradient(1000px 300px at 15% -30%, rgba(212,175,55,0.2), transparent), radial-gradient(700px 300px at 100% 130%, rgba(139,0,0,0.3), transparent), #0b0b0b",
        }}>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-gold/80 sm:text-[11px] sm:tracking-[0.35em]">
              Market intelligence · Week {currentWeek} · {games.length} games
            </p>
            <h1 className="mt-1 text-2xl font-extrabold uppercase tracking-wide text-white sm:mt-2 sm:text-5xl">The Odds Board</h1>
            <p className="mt-2 hidden max-w-xl text-sm text-gray-400 sm:block">Live lines, implied probabilities, and market signals across every game this week.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push(`/betting?week=${Math.max(1, currentWeek - 1)}`)} className={btn}>
              ← Prev
            </button>
            <span className="px-2 font-mono text-sm text-white">WK {currentWeek}</span>
            <button onClick={() => router.push(`/betting?week=${Math.min(18, currentWeek + 1)}`)} className={btn}>
              Next →
            </button>
          </div>
        </div>
      </header>

      {/* market signals */}
      {tiles.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-gray-400">Market signals</h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-5">
            {tiles.map((t) => (
              <div key={t.label} className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-2 sm:p-4">
                <span className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gold/10 blur-2xl" />
                <p className="truncate font-mono text-[8px] uppercase tracking-[0.1em] text-gray-500 sm:text-[10px] sm:tracking-[0.25em]">{t.label}</p>
                <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-white sm:mt-2 sm:text-3xl">{t.value}</p>
                <div className="mt-1 flex items-center gap-1.5 text-[9px] text-gray-400 sm:mt-2 sm:text-xs">
                  {t.logos.map((src, i) => (
                    <TeamLogo key={i} src={src} size={16} className="h-3 w-3 sm:h-4 sm:w-4" />
                  ))}
                  <span className="truncate">{t.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <EdgeBoard games={games} />

      {/* odds format toggle */}
      <div className="mb-2 flex items-center gap-1.5 overflow-x-auto sm:mb-3 sm:flex-wrap sm:gap-2">
        <span className="mr-0.5 shrink-0 font-mono text-[10px] uppercase tracking-[0.15em] text-gray-500 sm:mr-1 sm:text-[11px] sm:tracking-[0.25em]">Odds</span>
        {[
          ["american", "American"],
          ["decimal", "Decimal"],
          ["fractional", "Fractional"],
          ["implied", "Implied %"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => changeFormat(key)}
            className={`shrink-0 cursor-pointer rounded-full px-2.5 py-1 text-[10px] uppercase tracking-normal transition sm:px-4 sm:text-xs sm:tracking-widest ${
              format === key ? "bg-gold font-bold text-black" : "border border-white/10 text-gray-400 hover:text-white"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* sort control */}
      <div className="mb-3 flex items-center gap-1.5 overflow-x-auto sm:mb-4 sm:flex-wrap sm:gap-2">
        <span className="mr-1 font-mono text-[11px] uppercase tracking-[0.25em] text-gray-500">Sort</span>
        {SORTS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSort(key)}
            className={`shrink-0 cursor-pointer rounded-full px-2.5 py-1 text-[10px] uppercase tracking-normal transition sm:px-4 sm:text-xs sm:tracking-widest ${
              sort === key ? "bg-gold font-bold text-black" : "border border-white/10 text-gray-400 hover:text-white"
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className={`grid grid-cols-1 gap-3 transition-opacity xl:grid-cols-2 ${isLoading ? "opacity-60" : ""}`}>
        {sorted.map((g) => (
          <GameCard key={g.id} g={g} slip={slip} toggleLeg={toggleLeg} format={format} />
        ))}
      </div>
      <BetSlip legs={slip} format={format} onRemove={(id) => setSlip((prev) => prev.filter((l) => l.id !== id))} onClear={() => setSlip([])} />
      <p className={`mt-10 text-center text-[11px] text-gray-600 ${slip.length ? "pb-24 sm:pb-0" : ""}`}>Lines come from ESPN feed.</p>
    </div>
  );
}
