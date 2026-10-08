import NewsFeed from "@/components/NewsFeed";

export default function NewsPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
     <h1 className="page-title">NFL News</h1>
      <NewsFeed />
    </main>
  );
}