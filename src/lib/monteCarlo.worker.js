import { simulate } from "@/lib/monteCarlo";

// receives { games, meta, runs, market } from the page, sends back the odds
self.onmessage = (e) => {
  const { games, meta, runs, market } = e.data;
  self.postMessage(simulate(games, meta, runs, market));
};