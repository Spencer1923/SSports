import Link from "next/link";
import TeamLogo from "@/components/TeamLogo";
// season at a glance: one tile per week, results for played games, date for upcoming ones
export default function TeamSchedule({ games = [], teamId, recordsById = {}, byeWeek }) {
  const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  // turn each game into a simple object with everything a tile needs
  const items = games.map((game) => {
    const comp = game.competitions?.[0];
    const competitors = comp?.competitors || [];
    const self = competitors.find((c) => c.team.id === teamId);
    const opp = competitors.find((c) => c.team.id !== teamId);
    const mine = self?.score?.displayValue ?? self?.score;
    const theirs = opp?.score?.displayValue ?? opp?.score;
    // played = ESPN says completed, or (if that field is missing) a score exists
    const played = comp?.status?.type?.completed ?? (mine !== undefined && mine !== null);

    let result = null;
    if (played) result = self?.winner ? "W" : opp?.winner ? "L" : "T";

    return {
      type: "game",
      id: game.id,
      week: game.week?.number,
      date: game.date,
      isHome: self?.homeAway === "home",
      oppId: opp?.team.id,
      oppAbbr: opp?.team.abbreviation || opp?.team.shortDisplayName || opp?.team.nickname,
      oppLogo: opp?.team.logo || opp?.team.logos?.[0]?.href,
      mine,
      theirs,
      played,
      result,
    };
  });

  // find the bye myself: the week (1-18) with no game, instead of trusting ESPN's byeWeek
  const played = new Set(items.map((i) => i.week));
  const bye = Array.from({ length: 18 }, (_, i) => i + 1).find((w) => !played.has(w));
  if (bye) items.push({ type: "bye", week: bye });
  items.sort((a, b) => a.week - b.week);

  // the first unplayed game gets a gold ring
  const nextId = items.find((i) => i.type === "game" && !i.played)?.id;

  return (
    <section className="mt-8">
      <h2 className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-3">Schedule & Results</h2>

      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 xl:grid-cols-9 gap-2">
        {items.map((item) => {
          // bye week tile
          if (item.type === "bye") {
            return (
              <div key="bye" className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 p-2 text-center">
                <p className="text-[10px] uppercase tracking-widest text-gray-500">WK {item.week}</p>
                <p className="text-sm font-bold text-gray-500 mt-2">BYE</p>
              </div>
            );
          }

          // result colors: green = win, red = loss, gray = tie / not played yet
          const tone = item.result === "W" ? "text-green-400" : item.result === "L" ? "text-red-400" : "text-gray-300";
          const bar = item.result === "W" ? "bg-green-500" : item.result === "L" ? "bg-red-600" : item.result === "T" ? "bg-gray-500" : "bg-transparent";

          return (
            <Link
              key={item.id}
              href={`/games/${item.id}`}
              className={`relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-2 text-center transition hover:-translate-y-0.5 hover:border-gold/50 ${
                item.id === nextId ? "ring-1 ring-gold/70" : ""
              }`}>
              {/* thin result bar across the top */}
              <span className={`absolute top-0 inset-x-0 h-0.5 ${bar}`} />

              <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-500">
                <span>WK {item.week}</span>
                <span>{item.isHome ? "vs" : "@"}</span>
              </div>

              <TeamLogo src={item.oppLogo} size={36} className="w-9 h-9 mx-auto my-1.5" />

              <p className="text-xs text-gray-200 truncate">
                {item.oppAbbr} <span className="text-gray-500">({recordsById[item.oppId] || "—"})</span>
              </p>

              {item.played ? (
                <p className={`text-sm font-bold tabular-nums mt-1 ${tone}`}>
                  {item.result} {item.mine}–{item.theirs}
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-1">{fmtDate(item.date)}</p>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
