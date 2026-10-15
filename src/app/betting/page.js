import { Suspense } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import BettingBoard from "@/components/BettingBoard";

export const metadata = {
  title: "Betting Odds",
  description: "NFL spreads, moneylines, totals, implied probabilities, and market signals for every game.",
};

export default function BettingPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <Suspense fallback={<LoadingSpinner />}>
        <BettingBoard />
      </Suspense>
    </main>
  );
}