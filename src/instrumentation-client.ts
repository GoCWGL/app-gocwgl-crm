import { announceNavigation } from "@/utils/navigation";

/** Next.js calls this when an App Router navigation starts; the page loader listens for it. */
export function onRouterTransitionStart(url: string) {
  announceNavigation(url);
}
