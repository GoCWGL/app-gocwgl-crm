import type { SVGProps } from "react";

/**
 * Line icons drawn with a single SVG path (24×24 grid).
 * Color comes from `currentColor`, so icons follow the text color of their parent.
 */
export const ICONS = {
  plus: "M12 5v14M5 12h14",
  close: "M18 6 6 18M6 6l12 12",
  check: "M20 6 9 17l-5-5",
  chevronRight: "m9 6 6 6-6 6",
  chevronLeft: "m15 18-6-6 6-6",
  chevronUp: "m6 15 6-6 6 6",
  chevronDown: "m6 9 6 6 6-6",
  arrowLeft: "M19 12H5M11 6l-6 6 6 6",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  copy: "M8 8h13v13H8zM16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3",
  code: "M8 6 2 12l6 6M16 6l6 6-6 6",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z",
  radio: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  gauge: "M4 18a8 8 0 1 1 16 0M12 18l4-6",
  survey: "M8 4H6v17h12V4h-2M9 2h6v4H9zM9 12l1.5 1.5L13 11M9 17h6",
  mail: "M3 5h18v14H3zM3 7l9 6 9-6",
  send: "m22 2-7 20-4-9-9-4zM22 2 11 13",
  message: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  funnel: "M3 4h18l-7 8v6l-4 2v-8z",
  download: "M12 3v12M7 10l5 5 5-5M4 21h16",
  upload: "M12 16V4M7 9l5-5 5 5M4 20h16",
  lock: "M6 11h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM8 11V7a4 4 0 0 1 8 0v4",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18",
  calendar: "M3 4h18v17H3zM3 9h18M8 2v4M16 2v4",
  calendarCheck: "M3 4h18v17H3zM3 9h18M8 2v4M16 2v4M9 15l2 2 4-4",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  video: "M4 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM16 10l6-3v10l-6-3",
  pulse: "M22 12h-4l-3 9L9 3l-3 9H2",
  link: "M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
  userPlus: "M9 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM2 21c0-3.9 3.1-7 7-7s7 3.1 7 7M19 8v6M16 11h6",
  users: "M16 21a6 6 0 0 0-12 0M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21a5 5 0 0 0-5-5M17 3a4 4 0 0 1 0 8",
  user: "M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  invoice: "M6 2h9l5 5v15H6zM14 2v6h6M9 13h6M9 17h4",
  folder: "M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  folderUpload: "M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 11v6M9 14l3-3 3 3",
  pipeline: "M3 3h5v18H3zM10 3h5v12h-5zM17 3h4v8h-4z",
  gift: "M3 8h18v4H3zM5 12v9h14v-9M12 8v13M12 8S10 3 7.5 4.5 9 8 12 8zM12 8s2-5 4.5-3.5S15 8 12 8",
  expand: "M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7",
  shrink: "M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7",
  dollar: "M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  trendUp: "m3 17 6-6 4 4 8-8M15 7h6v6",
  chart: "M3 3v18h18M8 17v-5M13 17V8M18 17v-9",
  grid: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z",
  card: "M2 5h20v14H2zM2 10h20M6 15h4",
  rocket:
    "M12 15l-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2zM9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5",
  building: "M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  tag: "M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9zM8 8h.01",
  tagMinus: "M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9zM6 8h4",
  branch: "M6 3v5a5 5 0 0 0 5 5h2a5 5 0 0 1 5 5v3M18 3v5a5 5 0 0 1-5 5M6 21v-3",
  sparkle: "M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8",
  settings:
    "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  textShort: "M4 7V5h16v2M9 19h6M12 5v14",
  textLong: "M4 6h16M4 10h16M4 14h16M4 18h10",
  phone:
    "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z",
  dropdown: "M4 5h16v14H4zM9 11l3 3 3-3",
  checkbox: "M4 4h16v16H4zM8 12l3 3 5-6",
  hash: "M4 9h16M4 15h16M10 3 8 21M16 3l-2 18",
  form: "M4 3h16v18H4zM8 8h8M8 12h8M8 16h5",
  bug: "M9 7h6a2 2 0 0 1 2 2v7a5 5 0 0 1-10 0V9a2 2 0 0 1 2-2zM9 4l1.5 3M15 4l-1.5 3M3 12h4M17 12h4M4 18l3-1.5M20 18l-3-1.5",
  circleCheck: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 12l3 3 5-6",
  circleX: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15 9l-6 6M9 9l6 6",
} as const;

export type IconName = keyof typeof ICONS;

type IconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  /** A name from ICONS, or pass a raw path with `path`. */
  name?: IconName;
  path?: string;
  size?: number;
  strokeWidth?: number;
};

export function Icon({ name, path, size = 16, strokeWidth = 2, ...rest }: IconProps) {
  const d = path ?? (name ? ICONS[name] : "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={d} />
    </svg>
  );
}

/** Six-dot drag handle (filled, so it can't use the stroked <Icon>). */
export function GripIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {[6, 12, 18].map((y) => (
        <g key={y}>
          <circle cx="9" cy={y} r="1.6" />
          <circle cx="15" cy={y} r="1.6" />
        </g>
      ))}
    </svg>
  );
}

/** Rounded folder shape used for media folders; colors come from props. */
export function FolderGlyph({
  width = 44,
  height = 38,
  fill,
  stroke,
  strokeWidth = 1.5,
}: {
  width?: number;
  height?: number;
  fill: string;
  stroke: string;
  strokeWidth?: number;
}) {
  return (
    <svg width={width} height={height} viewBox="0 0 44 38" aria-hidden="true">
      <path
        d="M2 6a4 4 0 0 1 4-4h11l4 5h17a4 4 0 0 1 4 4v21a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}
