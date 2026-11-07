export default function robots() {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" }, // keep Google out of your data routes
    sitemap: "https://s-sports.netlify.app/sitemap.xml",
  };
}