import NewsFeed from "@/components/NewsFeed";

export default function NewsPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">NFL News</h1>
      <NewsFeed />
    </main>
  );
}