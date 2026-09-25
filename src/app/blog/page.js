import fs from "fs";
import path from "path";
import matter from "gray-matter"; // reads frontmatter (title/date) from .mdx files
import Link from "next/link";

export default function BlogPage() {
  // read all files in the posts folder
  const postsDir = path.join(process.cwd(), "src/content/posts");
  const files = fs.readdirSync(postsDir);

  // extract frontmatter (title, date) from each post
  const posts = files.map((filename) => {
    const filePath = path.join(postsDir, filename);
    const source = fs.readFileSync(filePath, "utf8");
    const { data } = matter(source);
    return { slug: filename.replace(".mdx", ""), ...data };
  });

  return (
    <main className="p-6">
     <h1 className="text-2xl font-bold mb-6 text-gold border-b-2 border-crimson pb-2">Blog</h1>
      {posts.map((post) => (
        <div key={post.slug} className="mb-3">
          <Link href={`/blog/${post.slug}`} className="text-gray-300 hover:text-crimson">
            {post.title}
          </Link>
          <p className="text-sm text-gray-500">{post.date}</p>
        </div>
      ))}
    </main>
  );
}