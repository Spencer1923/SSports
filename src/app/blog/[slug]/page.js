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
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gold border-b-2 border-crimson pb-2">
        {data.title}
      </h1>
      <p className="text-sm text-gray-500 mb-4">{data.date}</p>
      {/* team power rankings, with logo + reasoning per team */}
      {data.ranking && (
        <ol className="space-y-4 my-4">
          {data.ranking.map((item, i) => {
            const fullName = Object.keys(TEAM_LOGOS).find((name) =>
              name.includes(item.team),
            );
            return (
              <li key={item.team}>
                <div className="flex items-center gap-2">
                  <span className="font-bold w-5">{i + 1}.</span>
                  {fullName && (
                    <img
                      src={TEAM_LOGOS[fullName]}
                      alt={item.team}
                      className="w-6 h-6"
                    />
                  )}
                  <span className="font-semibold">{item.team}</span>
                </div>
                <p className="text-sm text-gray-500 ml-7">{item.reason}</p>
              </li>
            );
          })}
        </ol>
      )}

      {/* MVP rankings, with player headshot + reasoning per player */}
      {data.mvpRanking && (
        <ol className="space-y-4 my-4">
          {data.mvpRanking.map((item, i) => (
            <li key={item.playerId}>
              <div className="flex items-center gap-2">
                <span className="font-bold w-5">{i + 1}.</span>
                <img
                  src={`https://a.espncdn.com/i/headshots/nfl/players/full/${item.playerId}.png`}
                  alt={item.player}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <span className="font-semibold">{item.player}</span>
              </div>
              <p className="text-sm text-gray-500 ml-12">{item.reason}</p>
            </li>
          ))}
        </ol>
      )}
      <article className="prose">
        <MDXRemote source={content} />
      </article>
    </main>
  );
}
