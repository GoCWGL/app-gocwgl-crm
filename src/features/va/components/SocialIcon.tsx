import {
  siBehance,
  siDribbble,
  siFacebook,
  siGithub,
  siInstagram,
  siPinterest,
  siThreads,
  siTiktok,
  siUpwork,
  siX,
  siYoutube,
} from "simple-icons";
import { Icon } from "@/components/ui";
import type { SocialNetwork } from "../lib/socials";

/** Brand logos from Simple Icons (CC0). LinkedIn isn't in that set, so its "in" mark is drawn here. */
const LINKEDIN = {
  hex: "0A66C2",
  path:
    "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
};

const ICONS: Partial<Record<SocialNetwork, { hex: string; path: string }>> = {
  linkedin: LINKEDIN,
  facebook: siFacebook,
  instagram: siInstagram,
  x: siX,
  tiktok: siTiktok,
  youtube: siYoutube,
  threads: siThreads,
  pinterest: siPinterest,
  github: siGithub,
  behance: siBehance,
  dribbble: siDribbble,
  upwork: siUpwork,
};

/** Networks shown with a short lettered mark: OnlineJobs.ph has no public logo, and Fiverr's is a wordmark too wide for an icon. */
const TEXT_MARKS: Partial<Record<SocialNetwork, string>> = { onlinejobs: "OJ", fiverr: "fi" };
const BRAND_HEX: Partial<Record<SocialNetwork, string>> = { onlinejobs: "1D4ED8", fiverr: "1DBF73", other: "B45309" };

export const brandColor = (network: SocialNetwork) => `#${ICONS[network]?.hex ?? BRAND_HEX[network] ?? "0B1424"}`;

/** A network's own logo, in its brand color unless `color` says otherwise (e.g. white on a brand background). */
export function SocialIcon({ network, size = 16, color }: { network: SocialNetwork; size?: number; color?: string }) {
  const icon = ICONS[network];
  if (network === "other") return <Icon name="link" size={size} />;
  if (!icon) {
    const mark = TEXT_MARKS[network] ?? "•";
    return (
      <span className="social-icon-text" style={{ fontSize: Math.round(size * (mark.length > 1 ? 0.62 : 0.8)), color: color ?? brandColor(network) }} aria-hidden="true">
        {mark}
      </span>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color ?? brandColor(network)} aria-hidden="true" focusable="false">
      <path d={icon.path} />
    </svg>
  );
}
