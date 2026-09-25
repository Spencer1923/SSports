import fs from "fs";
import path from "path";
import matter from "gray-matter"; // reads title/date from each blog post file
import Link from "next/link";
import Scoreboard from "@/components/Scoreboard";
import NewsFeed from "@/components/NewsFeed";

// runs on the server — reads the latest blog posts from disk
function getLatestPosts() {
  const postsDir = path.join(process.cwd(), "src/content/posts");
  const files = fs.readdirSync(postsDir);

  const posts = files.map((filename) => {
    const source = fs.readFileSync(path.join(postsDir, filename), "utf8");
    const { data } = matter(source);
    return { slug: filename.replace(".mdx", ""), ...data };
  });

  // newest first, keep top 3
  return posts.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
}

export default function Home() {
  const latestPosts = getLatestPosts();

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gold border-b-2 border-crimson pb-2">SSports</h1>

      {/* two-column hub layout: scores left, news + blog right */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* left column: scores, takes up 2/3 width */}
        <div className="md:col-span-2">
          <h2 className="text-xl text-gray-300 font-semibold mb-3">Scores</h2>
          <Scoreboard />
        </div>

        {/* right column: news + latest articles, takes up 1/3 width */}
        <div className="md:col-span-1">
          <h2 className="text-xl font-semibold mb-3">Latest Articles</h2>
          <div className="mb-6">
            {latestPosts.map((post) => (
              <div key={post.slug} className="mb-3">
                <Link href={`/blog/${post.slug}`} className="text-gray-300 hover:text-crimson">
                  {post.title}
                </Link>
                <p className="text-sm text-gray-500">{post.date}</p>
              </div>
            ))}
          </div>

          <h2 className="text-xl font-semibold mb-3">News</h2>
          <NewsFeed limit={5} />
        </div>
      </div>
    </main>
  );
}