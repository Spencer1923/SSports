import { Suspense } from "react";
import Skeleton from "@/components/Skeleton";
import BettingBoard from "@/components/BettingBoard";

export const metadata = {
  title: "Betting Odds",
  description: "NFL spreads, moneylines, totals, implied probabilities, and market signals for every game.",
};

export default function BettingPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <Suspense fallback={<Skeleton variant="grid" hero bare count={4} rows={4} />}>
        <BettingBoard />
      </Suspense>
    </main>
  );
}
