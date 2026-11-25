import { StatGrid, type StatItem } from "@/components/ui";
import type { InvestorUpdateOut } from "@/utils/api/models";
import { formatCents } from "@/utils/format/money";

const PARTS = [
  ["wins", "Key wins"],
  ["challenges", "Challenges and blockers"],
  ["roadmap", "Product roadmap"],
  ["asks", "Asks"],
] as const;

/** An investor update as shareholders read it: the numbers shared with it, then each part that was written. */
export function UpdateBody({ update: u }: { update: InvestorUpdateOut }) {
  const k = u.kpis;
  const money = (cents: number) => formatCents(cents, k.currency ?? undefined);
  const stats: StatItem[] = [
    ...(k.mrrCents != null ? [{ label: "MRR", value: money(k.mrrCents), tone: "cyan" as const, glyph: "$" }] : []),
    ...(k.arrCents != null ? [{ label: "ARR", value: money(k.arrCents), tone: "purple" as const, glyph: "$" }] : []),
    ...(k.cashCents != null ? [{ label: "Cash", value: money(k.cashCents), tone: "green" as const, glyph: "$" }] : []),
    ...(k.netBurnCents != null && k.netBurnCents > 0 ? [{ label: "Net burn a month", value: money(k.netBurnCents), tone: "amber" as const, glyph: "$" }] : []),
    ...(k.runwayMonths != null ? [{ label: "Runway", value: `${k.runwayMonths} months`, tone: "green" as const, glyph: "#" }] : []),
  ];
  return (
    <div className="stack stack--16">
      {stats.length > 0 && <StatGrid items={stats} />}
      {PARTS.filter(([key]) => u[key].trim()).map(([key, label]) => (
        <div key={key} className="stack stack--4">
          <span className="u-strong u-ink">{label}</span>
          <p className="sh-text">{u[key]}</p>
        </div>
      ))}
    </div>
  );
}
