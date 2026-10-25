"use client";

import { useState } from "react";
import { Avatar, Badge, Input, LoadState, SegmentedControl } from "@/components/ui";
import { formatReferralCode, payoutMethodLabel } from "@/data/affiliates";
import { avatarTone } from "@/lib/tones";
import type { AffiliateOut } from "@/utils/api/models";
import { formatCents } from "@/utils/format/money";
import { useAffiliates } from "@/utils/hooks/useAffiliates";

type Filter = "active" | "removed";

/** Every client eligible for the program (Paid subscriber stage). Clicking one opens their account and referrals. */
export function AffiliatesTable({ onOpen }: { onOpen: (a: AffiliateOut) => void }) {
  const query = useAffiliates();
  const all = query.data ?? [];
  const [filter, setFilter] = useState<Filter>("active");
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const inView = all.filter((a) => (filter === "removed" ? !!a.removedAt : !a.removedAt));
  const shown = q
    ? inView.filter((a) => [a.name, a.company, a.email, a.referralCode].some((v) => v.toLowerCase().includes(q)))
    : inView;

  return (
    <>
      <div className="cluster cluster--8 affiliates-toolbar">
        <SegmentedControl
          size="sm"
          label="Show affiliates"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "active", label: "Active", count: all.filter((a) => !a.removedAt).length },
            { value: "removed", label: "Removed", count: all.filter((a) => a.removedAt).length },
          ]}
        />
        <Input
          size="sm"
          type="search"
          className="affiliates-toolbar__search"
          placeholder="Search name, business, email or referral ID"
          aria-label="Search affiliates"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <LoadState
        query={query}
        isEmpty={!shown.length}
        empty={
          q
            ? "No affiliates match your search."
            : filter === "removed"
              ? "No one has been removed from the program."
              : "No affiliates yet. Clients join once they reach the Paid subscriber stage of your sales pipeline."
        }
      >
        <div className="table-scroll">
          <table className="data-table data-table--plain affiliate-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Referral ID</th>
                <th>Referrals</th>
                <th>Earned</th>
                <th>To pay</th>
                <th>Payout</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((a) => (
                <tr
                  key={a.id}
                  className="affiliate-table__row"
                  tabIndex={0}
                  aria-label={`Open ${a.name || a.email}`}
                  onClick={() => onOpen(a)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen(a))}
                >
                  <td>
                    <div className="cluster cluster--nowrap cluster--8">
                      <Avatar name={a.name || a.email} tone={avatarTone(a.id)} size="sm" />
                      <div className="stack stack--2">
                        <span className="u-strong u-ink">{a.name || a.email}</span>
                        <span className="text-small">{[a.company, a.email].filter(Boolean).join(" · ")}</span>
                      </div>
                    </div>
                  </td>
                  <td className="data-table__mono">{formatReferralCode(a.referralCode)}</td>
                  <td className="data-table__mono">{a.referralsCount}</td>
                  <td className="data-table__mono">{formatCents(a.earnedCents)}</td>
                  <td className="data-table__mono">{a.owedCents ? formatCents(a.owedCents) : "—"}</td>
                  <td className="text-small">{a.payout ? `${payoutMethodLabel(a.payout.method)} · ${a.payout.summary}` : "Not added"}</td>
                  <td>
                    <Badge tone={a.removedAt ? "neutral" : "green"} dot>
                      {a.removedAt ? "Removed" : "Active"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LoadState>
    </>
  );
}
