"use client";
import { useState } from "react";
import Link from "next/link";

// simple top navigation shared across all pages
export default function Navbar() {
  const [open, setOpen] = useState(false);

  const linkClass =
    "hover:text-gold hover:underline hover:decoration-crimson hover:decoration-2 hover:underline-offset-6";

  const links = [
    { href: "/", label: "Home" },
    { href: "/standings", label: "Standings" },
    { href: "/injuries", label: "Injuries" },
    { href: "/blog", label: "Blog" },
    { href: "/leaders", label: "Leaders" },
    { href: "/news", label: "News" },
  ];

  return (
    <nav className="bg-jetblack border-b-2 border-gold text-gray-300">
      <div className="flex items-center justify-between p-4">
        <Link href="/">
          <img src="/logo-header.png" alt="SSports" className="h-12 md:h-20" />
        </Link>

        {/* desktop links — hidden on small screens */}
        <div className="hidden md:flex items-center gap-4">
          {links.map((link) => (
            <Link key={link.href} className={linkClass} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>

        {/* hamburger button — only shown on small screens */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-gray-300 text-2xl px-2"
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>

      {/* mobile dropdown menu */}
      {open && (
        <div className="md:hidden flex flex-col gap-3 px-4 pb-4">
          {links.map((link) => (
            <Link
              key={link.href}
              className={linkClass}
              href={link.href}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
