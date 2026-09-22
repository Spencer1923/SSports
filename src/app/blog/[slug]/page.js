import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote/rsc";

export default async function PostPage({ params }) {
  // Next.js 15+ requires awaiting params before using it
  const { slug } = await params;

  const filePath = path.join(process.cwd(), "src/content/posts", `${slug}.mdx`);
  const source = fs.readFileSync(filePath, "utf8");
  const { content, data } = matter(source); // split frontmatter from body text

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">{data.title}</h1>
      <p className="text-sm text-gray-500 mb-4">{data.date}</p>
      <article className="prose">
        <MDXRemote source={content} />
      </article>
    </main>
  );
}