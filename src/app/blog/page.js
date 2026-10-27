import fs from "fs";
import path from "path";
import matter from "gray-matter"; // reads frontmatter (title/date) from .mdx files
import Link from "next/link";

// "2026-10-26" -> "Oct 26, 2026". Built from its parts so the timezone can't shift it a day.
function formatDate(str) {
  const [y, m, d] = String(str).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// short label for the kind of post
const kindOf = (post) => (post.ranking ? "Power Rankings" : post.mvpRanking ? "MVP Race" : "Article");

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

  const thisWeek = posts.slice(0, 2); // your two posts for the week
  const earlier = posts.slice(2);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="page-title">Blog</h1>

      {/* this week: the two newest posts, equal size */}
      <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-gray-500">This week</h2>
      <div className="mb-10 grid gap-3 md:grid-cols-2">
        {thisWeek.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="card card-hover group block p-5">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-gray-500">
              {kindOf(post)} · {formatDate(post.date)}
            </p>
            <h3 className="text-2xl font-bold leading-tight text-gray-100 group-hover:text-white">{post.title}</h3>
          </Link>
        ))}
      </div>

      {/* earlier weeks: small cards */}
      {earlier.length > 0 && (
        <>
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-gray-500">Earlier</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {earlier.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="card card-hover group block p-4">
                <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
                  {kindOf(post)} · {formatDate(post.date)}
                </p>
                <h3 className="text-base font-semibold leading-snug text-gray-200 group-hover:text-white">{post.title}</h3>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}