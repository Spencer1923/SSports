import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote/rsc";
import { TEAM_LOGOS } from "@/lib/divisions";

export default async function PostPage({ params }) {
  // Next.js 15+ requires awaiting params before using it
  const { slug } = await params;

  const filePath = path.join(process.cwd(), "src/content/posts", `${slug}.mdx`);
  const source = fs.readFileSync(filePath, "utf8");
  const { content, data } = matter(source); // split frontmatter from body text

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="page-title">{data.title}</h1>
      <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-6">{data.date}</p>
      {/* team power rankings, with logo + reasoning per team */}
      {data.ranking && (
        <ol className="space-y-3 my-6">
          {data.ranking.map((item, i) => {
            const fullName = Object.keys(TEAM_LOGOS).find((name) => name.includes(item.team));
            return (
              <li key={item.team} className="card p-4 flex gap-4">
                {/* big gold rank number */}
                <span className="text-3xl font-extrabold tabular-nums text-gold w-10 shrink-0">{i + 1}</span>
                <div>
                  <div className="flex items-center gap-2">
                    {fullName && <img src={TEAM_LOGOS[fullName]} alt={item.team} className="w-8 h-8 drop-shadow-lg" />}
                    <span className="text-lg font-bold text-gray-100">{item.team}</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{item.reason}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* MVP rankings, with player headshot + reasoning per player */}
      {data.mvpRanking && (
        <ol className="space-y-3 my-6">
          {data.mvpRanking.map((item, i) => (
            <li key={item.playerId} className="card p-4 flex gap-4">
              <span className="text-3xl font-extrabold tabular-nums text-gold w-10 shrink-0">{i + 1}</span>
              <div>
                <div className="flex items-center gap-3">
                  <img
                    src={`https://a.espncdn.com/i/headshots/nfl/players/full/${item.playerId}.png`}
                    alt={item.player}
                    className="w-14 h-14 rounded-full object-cover object-top ring-2 ring-gold/60 bg-white/5"
                  />
                  <span className="text-lg font-bold text-gray-100">{item.player}</span>
                </div>
                <p className="text-sm text-gray-400 mt-2">{item.reason}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
      <article className="prose prose-invert max-w-none">
        <MDXRemote source={content} />
      </article>
    </main>
  );
}
