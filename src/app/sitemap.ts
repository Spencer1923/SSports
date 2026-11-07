import fs from "fs";
import path from "path";
import { TEAM_IDS } from "@/lib/divisions";

const BASE = "https://s-sports.netlify.app";

export default function sitemap() {
  // fixed pages
  const pages = ["", "/standings", "/leaders", "/team-stats", "/injuries", "/news", "/transactions", "/betting", "/playoffs", "/blog"].map((p) => ({
    url: `${BASE}${p}`,
    changeFrequency: p === "" ? "hourly" : "daily",
  }));

  // one entry per team page
  const teams = Object.values(TEAM_IDS).map((id) => ({ url: `${BASE}/teams/${id}`, changeFrequency: "daily" }));

  // one entry per blog post, dated from its frontmatter
  const dir = path.join(process.cwd(), "src/content/posts");
  const posts = fs.readdirSync(dir).map((f) => ({
    url: `${BASE}/blog/${f.replace(".mdx", "")}`,
    lastModified: fs.statSync(path.join(dir, f)).mtime,
    changeFrequency: "weekly",
  }));

  return [...pages, ...teams, ...posts];
}