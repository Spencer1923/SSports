import fs from "fs";
import path from "path";
import matter from "gray-matter";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import { TEAM_LOGOS, TEAM_IDS } from "@/lib/divisions";
import TeamLogo from "@/components/TeamLogo";

// rank badge: the top 3 get a gold treatment, #1 glows
const badge = (i) => (i === 0 ? "bg-gold text-black shadow-[0_0_18px_rgba(212,175,55,0.7)]" : i < 3 ? "border border-gold/50 bg-gold/10 text-gold" : "border border-white/15 bg-white/5 text-gray-300");

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
  return <span className={`font-mono text-xs font-bold ${n > 0 ? "text-green-400" : "text-red-400"}`}>{n > 0 ? `▲${n}` : `▼${-n}`}</span>;
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
      {/* header */}
      <h1 className="page-title">{data.title}</h1>
      <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.3em] text-gold/80">
        {data.ranking ? "Power rankings" : data.mvpRanking ? "MVP race" : "Article"} · {data.date}
      </p>

      {/* team power rankings */}
      {data.ranking && (
        <ol className="my-6 space-y-3">
          {data.ranking.map((item, i) => {
            const fullName = Object.keys(TEAM_LOGOS).find((name) => name.includes(item.team));
            return (
              <li key={item.team} className="card card-hover relative flex gap-4 overflow-hidden p-4">
                <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-xl font-extrabold tabular-nums ${badge(i)}`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    {fullName && <TeamLogo src={TEAM_LOGOS[fullName]} alt={item.team} size={40} className="h-10 w-10 drop-shadow-lg" />}
                    {fullName ? (
                      <Link href={`/teams/${TEAM_IDS[fullName]}`} className="text-xl font-bold text-gray-100 hover:text-gold">
                        {item.team}
                      </Link>
                    ) : (
                      <span className="text-xl font-bold text-gray-100">{item.team}</span>
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
        <ol className="my-6 space-y-3">
          {data.mvpRanking.map((item, i) => (
            <li key={item.playerId} className="card card-hover relative flex gap-4 overflow-hidden p-4">
              <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-xl font-extrabold tabular-nums ${badge(i)}`}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <TeamLogo
                    src={`https://a.espncdn.com/i/headshots/nfl/players/full/${item.playerId}.png`}
                    alt={item.player}
                    size={56}
                    className="h-14 w-14 rounded-full bg-white/5 object-cover object-top ring-2 ring-gold/60"
                  />
                  <Link href={`/players/${item.playerId}`} className="text-xl font-bold text-gray-100 hover:text-gold">
                    {item.player}
                  </Link>
                  {prevPlayers && <Move prev={prevPlayers[item.playerId]} now={i} />}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{item.reason}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {/* the written article */}
      <article className="card prose prose-invert mt-8 max-w-none p-5 sm:p-8">
        <MDXRemote source={content} />
      </article>
    </main>
  );
}
