"use client";
import useSWR from "swr";

const fetcher = (url) => fetch(url).then((res) => res.json());

// reusable news list — used on both the homepage (limited) and /news (full)
export default function NewsFeed({ limit }) {
  const { data, error, isLoading } = useSWR("/api/news", fetcher, {
    refreshInterval: 600000,
  });

  if (error) return <p>Failed to load news.</p>;
  if (isLoading) return <p>Loading news...</p>;

  // trim to `limit` articles if provided, otherwise show all
  const articles = limit ? data.articles.slice(0, limit) : data.articles;

  return (
    <div>
      {articles.map((article) => (
        <a
          key={article.id}
          href={article.links?.web?.href}
          target="_blank"
          rel="noopener noreferrer"
          className="block border-b py-2"
        >
          <p className="font-medium text-sm">{article.headline}</p>
        </a>
      ))}
    </div>
  );
}
