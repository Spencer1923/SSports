import Link from "next/link";

// simple top navigation shared across all pages
export default function Navbar() {
  return (
    <nav className="flex items-center gap-4 p-4 bg-jetblack border-b-2 border-gold text-gray-300">
      <img src="/logo-header.png" alt="SSports" className="h-20" />
      <Link className="hover:text-gold hover:underline hover:decoration-crimson hover:decoration-2 hover:underline-offset-6" href="/">Home</Link>
      <Link className="hover:text-gold hover:underline hover:decoration-crimson hover:decoration-2 hover:underline-offset-6" href="/standings">Standings</Link>
      <Link className="hover:text-gold hover:underline hover:decoration-crimson hover:decoration-2 hover:underline-offset-6" href="/injuries">Injuries</Link>
      <Link className="hover:text-gold hover:underline hover:decoration-crimson hover:decoration-2 hover:underline-offset-6" href="/blog">Blog</Link>
      <Link className="hover:text-gold hover:underline hover:decoration-crimson hover:decoration-2 hover:underline-offset-6" href="/leaders">Leaders</Link>
      <Link className="hover:text-gold hover:underline hover:decoration-crimson hover:decoration-2 hover:underline-offset-6" href="/news">News</Link>
    </nav>
  );
}
