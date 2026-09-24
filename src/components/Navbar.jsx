import Link from "next/link";

// simple top navigation shared across all pages
export default function Navbar() {
  return (
    <nav className="flex items-center gap-4 p-4 bg-jetblack border-b-2 border-gold text-gray-300">
      <img src="/logo-header.png" alt="SSports" className="h-10" />
      <Link href="/">Home</Link>
      <Link href="/standings">Standings</Link>
      <Link href="/injuries">Injuries</Link>
      <Link href="/blog">Blog</Link>
      <Link href="/leaders">Leaders</Link>
      <Link href="/news">News</Link>
    </nav>
  );
}
