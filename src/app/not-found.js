import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <Image src="/logo-medium.png" alt="SSports" width={256} height={199} className="w-20 h-20 mb-4 object-contain" />
      <h1 className="page-title">404 — Page Not Found</h1>
      <p className="text-gray-400 mb-6">Looks like this play did not make it past the line of scrimmage.</p>
      <Link href="/" className="rounded-full border border-white/15 px-5 py-2 text-sm uppercase tracking-widest transition hover:bg-gold hover:text-black">
        Back to Home
      </Link>
    </main>
  );
}
