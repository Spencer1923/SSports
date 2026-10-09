import fs from "fs";
import path from "path";
import matter from "gray-matter"; // reads frontmatter (title/date) from .mdx files
import Link from "next/link";

export default function BlogPage() {
  // read all files in the posts folder
  const postsDir = path.join(process.cwd(), "src/content/posts");
  const files = fs.readdirSync(postsDir);

  // extract frontmatter (title, date) from each post
  const posts = files
    .map((filename) => {
      const filePath = path.join(postsDir, filename);
      const source = fs.readFileSync(filePath, "utf8");
      const { data } = matter(source);
      return { slug: filename.replace(".mdx", ""), ...data };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date)); // newest first

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="page-title">Blog</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {posts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="card card-hover block p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-2">{post.date}</p>
            <h2 className="text-xl font-bold text-gray-100">{post.title}</h2>
          </Link>
        ))}
      </div>
    </main>
  );
}
