import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <img src="/logo-medium.png" alt="SSports" className="w-20 h-20 mb-4" />
      <h1 className="page-title">404 — Page Not Found</h1>
      <p className="text-gray-400 mb-6">Looks like this play did not make it past the line of scrimmage.</p>
      <Link href="/" className="rounded-full border border-white/15 px-5 py-2 text-sm uppercase tracking-widest transition hover:bg-gold hover:text-black">
        Back to Home
      </Link>
    </main>
  );
}
