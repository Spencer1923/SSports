import fs from "fs";
import path from "path";
import matter from "gray-matter"; // reads frontmatter (title/date) from .mdx files
import Link from "next/link";
import { TEAM_LOGOS } from "@/lib/divisions";
import TeamLogo from "@/components/TeamLogo";

export default function BlogPage() {
  // read all files in the posts folder
  const postsDir = path.join(process.cwd(), "src/content/posts");
  const files = fs.readdirSync(postsDir);

  // extract frontmatter from each post, newest first
  const posts = files
    .map((filename) => {
      const source = fs.readFileSync(path.join(postsDir, filename), "utf8");
      const { data } = matter(source);
      return { slug: filename.replace(".mdx", ""), ...data };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="page-title">Blog</h1>

      <div className="grid gap-4 md:grid-cols-2">
        {posts.map((post, i) => {
          const kind = post.ranking ? "Power rankings" : post.mvpRanking ? "MVP race" : "Article";
          // top 3 of whichever ranking the post has
          const top = (post.ranking || post.mvpRanking || []).slice(0, 3);

          return (
            <Link key={post.slug} href={`/blog/${post.slug}`} className={`card card-hover group relative block overflow-hidden p-5 ${i === 0 ? "md:col-span-2" : ""}`}>
              <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
              <span className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gold/10 blur-2xl" />

              <div className="relative">
                <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em]">
                  {i === 0 && <span className="rounded-full bg-gold px-2 py-0.5 font-bold text-black">Latest</span>}
                  <span className="text-gold/80">{kind}</span>
                  <span className="text-gray-600">· {post.date}</span>
                </div>

                <h2 className={`font-extrabold uppercase tracking-wide text-gray-100 group-hover:text-white ${i === 0 ? "text-3xl" : "text-xl"}`}>{post.title}</h2>

                {/* top 3 preview: team logos or player headshots */}
                {top.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {top.map((item, n) => {
                      const fullName = item.team && Object.keys(TEAM_LOGOS).find((name) => name.includes(item.team));
                      const img = fullName ? TEAM_LOGOS[fullName] : item.playerId ? `https://a.espncdn.com/i/headshots/nfl/players/full/${item.playerId}.png` : null;
                      return (
                        <span key={n} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3 text-sm text-gray-300">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold/15 font-mono text-[11px] font-bold text-gold">{n + 1}</span>
                          {img && <TeamLogo src={img} size={24} className={`h-6 w-6 ${item.playerId ? "rounded-full object-cover object-top" : ""}`} />}
                          {item.team || item.player}
                        </span>
                      );
                    })}
                  </div>
                )}

                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-gold">Read →</p>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}