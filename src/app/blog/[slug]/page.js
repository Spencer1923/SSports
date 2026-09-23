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
      <h1 className="text-2xl font-bold mb-6 text-gold border-b-2 border-crimson pb-2">{data.title}</h1>
      <p className="text-sm text-gray-500 mb-4">{data.date}</p>
      {data.ranking && (
        <ol className="space-y-2 my-4">
          {data.ranking.map((team, i) => {
            const fullName = Object.keys(TEAM_LOGOS).find((name) =>
              name.includes(team),
            );
            return (
              <li key={team} className="flex items-center gap-2">
                <span className="font-bold w-5">{i + 1}.</span>
                {fullName && (
                  <img
                    src={TEAM_LOGOS[fullName]}
                    alt={team}
                    className="w-6 h-6"
                  />
                )}
                <span>{team}</span>
              </li>
            );
          })}
        </ol>
      )}
      <article className="prose">
        <MDXRemote source={content} />
      </article>
    </main>
  );
}
