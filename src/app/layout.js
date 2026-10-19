import Navbar from "@/components/Navbar";
import "./globals.css";
import { Oswald, Inter } from "next/font/google";
import Image from "next/image";

const oswald = Oswald({ subsets: ["latin"], variable: "--font-heading" });
const inter = Inter({ subsets: ["latin"], variable: "--font-body" });

export const metadata = {
  manifest: "/site.webmanifest",
  title: {
    default: "SSports — NFL Scores, Standings & Analysis",
    template: "%s | SSports",
  },
  metadataBase: new URL("https://s-sports.netlify.app/"),
  description: "Live NFL scores, standings, league leaders, injury reports, and weekly power rankings.",
  openGraph: {
    title: "SSports",
    description: "Live NFL scores, standings, league leaders, injury reports, and weekly power rankings.",
    images: [{ url: "/logo-medium.png", width: 256, height: 199, alt: "SSports" }],
    type: "website",
  },
  icons: {
    icon: [
      { url: "/ssports_favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/ssports_favicon-32x32.png", sizes: "32x32", type: "image/png" },
      {
        url: "/ssports_android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/ssports_android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: "/ssports_apple-touch-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${oswald.variable} ${inter.variable}`}>
        <Navbar /> {/* shows on every page */}
        {children}
        <footer className="relative flex flex-col items-center gap-2 p-8 mt-12 text-xs text-gray-500">
          <span className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-crimson to-transparent" />
          <Image src="/logo-medium.png" alt="SSports" width={256} height={199} sizes="64px" className="w-16 h-16 object-contain" />
        </footer>
      </body>
    </html>
  );
}
