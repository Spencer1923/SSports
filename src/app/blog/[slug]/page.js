import fs from "fs";
import path from "path";
import matter from "gray-matter";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import { TEAM_LOGOS, TEAM_IDS } from "@/lib/divisions";
import TeamLogo from "@/components/TeamLogo";

// "2026-10-26" -> "Oct 26, 2026" (built from parts so the timezone can't shift the day)
function formatDate(str) {
  const [y, m, d] = String(str).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// finds the previous post of the same kind and returns { team or playerId: its old rank }
function getPrevRanks(slug, field, keyName, date) {
  const dir = path.join(process.cwd(), "src/content/posts");
  const prev = fs
    .readdirSync(dir)
    .map((f) => ({ slug: f.replace(".mdx", ""), ...matter(fs.readFileSync(path.join(dir, f), "utf8")).data }))
    .filter((p) => p[field] && p.slug !== slug && new Date(p.date) < new Date(date))
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  if (!prev) return null; // first post of its kind: show no arrows
  return Object.fromEntries(prev[field].map((item, i) => [item[keyName], i]));
}

// ▲ green = moved up, ▼ red = moved down, – = same, NEW = wasn't ranked last time
function Move({ prev, now }) {
  if (prev === undefined) return <span className="font-mono text-xs text-gray-500">NEW</span>;
  const n = prev - now;
  if (!n) return <span className="font-mono text-xs text-gray-500">–</span>;
  return <span className={`font-mono text-xs ${n > 0 ? "text-green-400" : "text-red-400"}`}>{n > 0 ? `▲${n}` : `▼${-n}`}</span>;
}

export default async function PostPage({ params }) {
  // Next.js 15+ requires awaiting params before using it
  const { slug } = await params;

  const filePath = path.join(process.cwd(), "src/content/posts", `${slug}.mdx`);
  const source = fs.readFileSync(filePath, "utf8");
  const { content, data } = matter(source); // split frontmatter from body text
  const prevTeams = data.ranking ? getPrevRanks(slug, "ranking", "team", data.date) : null;
  const prevPlayers = data.mvpRanking ? getPrevRanks(slug, "mvpRanking", "playerId", data.date) : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/blog" className="text-sm text-gray-500 hover:text-white">
        ← Blog
      </Link>

      {/* header */}
      <h1 className="page-title mt-4">{data.title}</h1>
      <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-gray-500">
        {data.ranking ? "Power Rankings" : data.mvpRanking ? "MVP Race" : "Article"} · {formatDate(data.date)}
      </p>

      {/* team power rankings: plain numbered list with dividers */}
      {data.ranking && (
        <ol className="my-6 divide-y divide-white/10 border-y border-white/10">
          {data.ranking.map((item, i) => {
            const fullName = Object.keys(TEAM_LOGOS).find((name) => name.includes(item.team));
            return (
              <li key={item.team} className="flex gap-3 py-3 sm:gap-4 sm:py-5">
                <span className="w-6 shrink-0 pt-1 text-right font-mono text-lg tabular-nums text-gray-500">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    {fullName && <TeamLogo src={TEAM_LOGOS[fullName]} alt={item.team} size={32} className="h-6 w-6 sm:h-8 sm:w-8" />}
                    {fullName ? (
                      <Link href={`/teams/${TEAM_IDS[fullName]}`} className="text-base font-semibold sm:text-lg text-gray-100 hover:underline">
                        {item.team}
                      </Link>
                    ) : (
                      <span className="text-base font-semibold sm:text-lg text-gray-100">{item.team}</span>
                    )}
                    {prevTeams && <Move prev={prevTeams[item.team]} now={i} />}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{item.reason}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* MVP rankings */}
      {data.mvpRanking && (
        <ol className="my-6 divide-y divide-white/10 border-y border-white/10">
          {data.mvpRanking.map((item, i) => (
            <li key={item.playerId} className="flex gap-3 py-3 sm:gap-4 sm:py-5">
              <span className="w-5 shrink-0 pt-0.5 text-right font-mono text-sm sm:w-6 sm:pt-1 sm:text-lg tabular-nums text-gray-500">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <TeamLogo
                    src={`https://a.espncdn.com/i/headshots/nfl/players/full/${item.playerId}.png`}
                    alt={item.player}
                    size={48}
                    className="h-9 w-9 sm:h-12 sm:w-12 rounded-full bg-white/5 object-cover object-top"
                  />
                  <Link href={`/players/${item.playerId}`} className="text-base font-semibold sm:text-lg text-gray-100 hover:underline">
                    {item.player}
                  </Link>
                  {prevPlayers && <Move prev={prevPlayers[item.playerId]} now={i} />}
                </div>
                <p className="mt-2 text-[13px] leading-relaxed sm:text-sm text-gray-400">{item.reason}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {/* honorable mentions: unranked, only shown if the post has the field */}
      {data.honorableMentions?.length > 0 && (
        <section className="my-6">
          <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500 sm:text-[11px]">Honorable mention</h2>
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {data.honorableMentions.map((item) => (
              <li key={item.playerId || item.player} className="flex items-start gap-3 py-3 sm:py-4">
                {/* headshot only if we have an id */}
                {item.playerId && (
                  <TeamLogo
                    src={`https://a.espncdn.com/i/headshots/nfl/players/full/${item.playerId}.png`}
                    alt={item.player}
                    size={40}
                    className="h-8 w-8 rounded-full bg-white/5 object-cover object-top sm:h-10 sm:w-10"
                  />
                )}
                <div className="min-w-0 flex-1">
                  {item.playerId ? (
                    <Link href={`/players/${item.playerId}`} className="text-base font-semibold text-gray-100 hover:underline sm:text-lg">
                      {item.player}
                    </Link>
                  ) : (
                    <span className="text-base font-semibold text-gray-100 sm:text-lg">{item.player}</span>
                  )}
                  {/* the reason is optional */}
                  {item.reason && <p className="mt-1 text-[13px] leading-relaxed text-gray-400 sm:text-sm">{item.reason}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* the written article */}
      <article className="prose prose-invert mt-8 max-w-none">
        <MDXRemote source={content} />
      </article>
    </main>
  );
}
