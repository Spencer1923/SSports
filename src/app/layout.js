import Navbar from "@/components/Navbar";
import "./globals.css";
import { Oswald, Inter } from "next/font/google";

const oswald = Oswald({ subsets: ["latin"], variable: "--font-heading" });
const inter = Inter({ subsets: ["latin"], variable: "--font-body" });

export const metadata = {
  manifest: "ssports_site.webmanifest",
  title: {
    default: "SSports — NFL Scores, Standings & Analysis",
    template: "%s | SSports",
  },
  metadataBase: new URL("https://s-sports.netlify.app/"),
  description: "Live NFL scores, standings, league leaders, injury reports, and weekly power rankings.",
  openGraph: {
    title: "SSports",
    description: "Live NFL scores, standings, league leaders, injury reports, and weekly power rankings.",
    images: ["/logo-medium.png"],
    type: "website",
  },
  icons: {
    icon: [
      { url: "ssports_favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "ssports_favicon-32x32.png", sizes: "32x32", type: "image/png" },
      {
        url: "ssports_android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "ssports_android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: "ssports_apple-touch-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${oswald.variable} ${inter.variable}`}>
        <Navbar /> {/* shows on every page */}
        {children}
        <footer className="flex flex-col items-center gap-2 p-8 mt-12 border-t border-gold/30 text-xs text-gray-500">
          <img src="/logo-medium.png" alt="SSports" className="w-16 h-16" />
          <p>Data: ESPN</p>
        </footer>
      </body>
    </html>
  );
}
