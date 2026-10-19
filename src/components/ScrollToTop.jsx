"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// jumps to the top of the page whenever the URL path changes
export default function ScrollToTop() {
  const pathname = usePathname();
  useEffect(() => {
    // "instant" skips the smooth-scroll animation your layout turns on
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}