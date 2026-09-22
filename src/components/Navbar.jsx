import Link from "next/link";

// simple top navigation shared across all pages
export default function Navbar() {
  return (
    <nav className="flex gap-4 p-4 border-b">
      <Link href="/">Home</Link>
      <Link href="/standings">Standings</Link>
      <Link href="/injuries">Injuries</Link>
      <Link href="/blog">Blog</Link>
    </nav>
  );
}