import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <img src="/logo-medium.png" alt="SSports" className="w-20 h-20 mb-4" />
      <h1 className="text-3xl font-bold text-[#D4AF37] mb-2">404 — Page Not Found</h1>
      <p className="text-gray-400 mb-6">Looks like this play did not make it past the line of scrimmage.</p>
      <Link href="/" className="text-[#D4AF37] hover:text-[#8B0000] underline">
        Back to Home
      </Link>
    </main>
  );
}