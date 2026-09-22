import fs from "fs";
import path from "path";
import matter from "gray-matter"; // reads title/date from the top of each .mdx post
import Link from "next/link";
import Scoreboard from "@/components/Scoreboard";

// runs on the server at request time — reads the latest blog posts from disk
function getLatestPosts() {
  const postsDir = path.join(process.cwd(), "src/content/posts");
  const files = fs.readdirSync(postsDir);

  // pull frontmatter (title, date) out of every post file
  const posts = files.map((filename) => {
    const source = fs.readFileSync(path.join(postsDir, filename), "utf8");
    const { data } = matter(source);
    return { slug: filename.replace(".mdx", ""), ...data };
  });

  // sort newest first, then keep only the top 3
  return posts.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
}

export default function Home() {
  const latestPosts = getLatestPosts();

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">SSports</h1>

      {/* live scores widget */}
      <Scoreboard />

      {/* latest blog posts section */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-3">Latest Articles</h2>
        {latestPosts.map((post) => (
          <div key={post.slug} className="mb-3">
            <Link href={`/blog/${post.slug}`} className="text-blue-600 hover:underline">
              {post.title}
            </Link>
            <p className="text-sm text-gray-500">{post.date}</p>
          </div>
        ))}
      </section>
    </main>
  );
}