import { preload } from "swr";

const fetcher = (url) => fetch(url).then((res) => res.json());

// returns props to spread onto a <Link>: loads that page's data when the mouse hovers or a finger touches it
// `url` must be exactly the key the destination page passes to useSWR
export const prefetchProps = (url) => ({
  onMouseEnter: () => preload(url, fetcher),
  onTouchStart: () => preload(url, fetcher),
});