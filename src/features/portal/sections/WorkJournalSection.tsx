"use client";

import { useMemo, useState } from "react";
import { Avatar, Badge, Button, Icon, Input, LoadState, SegmentedControl, Select, StatGrid } from "@/components/ui";
import { avatarTone } from "@/lib/tones";
import { EntryLabelChips, type TagColor } from "@/features/va/components/EntryLabels";
import { dayHeading, dayKey, downloadCsv, rangeFor, rangeLabel, RANGES, timeOf, type RangeKey } from "@/features/va/lib/time";
import type { JournalEntry } from "@/utils/api/models";
import { formatCentsExact } from "@/utils/format/money";
import { useTimeTags, useVaTeam, useWorkJournal } from "@/utils/hooks/useClientWork";
import { TimeTagsModal } from "../components/TimeTagsModal";
import { hm, hoursDecimal, isoDay } from "../lib/vaTeam";
import { usePortal } from "../state/PortalContext";

type Range = RangeKey | "custom";
const PRESETS: Array<{ value: Range; label: string }> = [...RANGES.filter((r) => r.value !== "today"), { value: "custom", label: "Custom" }];
const MAX_DAYS = 92;

const fromIso = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const daysBetween = (a: string, b: string) => Math.round((fromIso(b).getTime() - fromIso(a).getTime()) / 86_400_000);

/**
 * Client portal › VA tracker: every entry your VAs logged for your business, grouped by day, with what it's worth
 * (billable time × the VA's rate). Pick the dates, the VA, a project code or a tag; manage the tags your VAs pick from.
 */
export function WorkJournalSection() {
  const { readOnly } = usePortal();
  const [range, setRange] = useState<Range>("week");
  const [vaId, setVaId] = useState("");
  const [code, setCode] = useState("");
  const [tag, setTag] = useState("");
  const [tagsOpen, setTagsOpen] = useState(false);
  // Custom range: starts as this week, editable with From / To.
  const week = rangeFor("week");
  const [from, setFrom] = useState(isoDay(week.start));
  const [to, setTo] = useState(isoDay(new Date(week.end.getFullYear(), week.end.getMonth(), week.end.getDate() - 1)));

  const preset = range === "custom" ? null : rangeFor(range);
  const start = preset ? isoDay(preset.start) : from;
  const end = preset ? isoDay(new Date(preset.end.getFullYear(), preset.end.getMonth(), preset.end.getDate() - 1)) : to;
  const badRange = !start || !end || end < start ? "Pick an end date on or after the start." : daysBetween(start, end) > MAX_DAYS ? "Pick up to three months." : "";
  const r = { start: fromIso(start || isoDay(new Date())), end: new Date(fromIso(end || start).getTime() + 86_400_000) };
  const journal = useWorkJournal(badRange ? "" : start, badRange ? "" : end);
  const all = useMemo(() => journal.data ?? [], [journal.data]);
  const tagList = useTimeTags().data;
  const tagColors = useMemo(() => new Map((tagList ?? []).map((t) => [t.name, t.color as TagColor])), [tagList]);

  // Every VA on the team (plus anyone who logged time in this range), so the client can pick one.
  const team = useVaTeam().data;
  const vas = useMemo(() => {
    const m = new Map<string, string>((team ?? []).map((v) => [v.vaId, v.name]));
    all.forEach((e) => m.set(e.vaId, e.vaName));
    return [...m].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [all, team]);
  const codes = useMemo(() => [...new Set(all.map((e) => e.projectCode).filter(Boolean))].sort(), [all]);
  const tags = useMemo(() => [...new Set([...(tagList ?? []).map((t) => t.name), ...all.flatMap((e) => e.tags)])].sort(), [all, tagList]);

  const shown = all.filter((e) => (!vaId || e.vaId === vaId) && (!code || e.projectCode === code) && (!tag || e.tags.includes(tag)));
  const days = useMemo(() => {
    const m = new Map<string, JournalEntry[]>();
    shown.forEach((e) => {
      const k = dayKey(new Date(e.startedAt));
      m.set(k, [...(m.get(k) ?? []), e]);
    });
    return [...m].sort((a, b) => b[0].localeCompare(a[0]));
  }, [shown]);
  const total = shown.reduce((n, e) => n + e.seconds, 0);
  const billable = shown.reduce((n, e) => n + (e.billable ? e.seconds : 0), 0);
  const value = shown.reduce((n, e) => n + e.valueCents, 0);
  const vaName = vas.find((v) => v.value === vaId)?.label;

  const exportCsv = () =>
    downloadCsv(
      `va-tracker-${isoDay(r.start)}.csv`,
      ["Date", "VA", "Start", "End", "Hours", "Billable", "Project code", "Tags", "Category", "Notes", "Tasks completed", "Rate", "Value"],
      shown.map((e) => [
        dayKey(new Date(e.startedAt)),
        e.vaName,
        timeOf(e.startedAt),
        e.endedAt ? timeOf(e.endedAt) : "In progress",
        hoursDecimal(e.seconds),
        e.billable ? "yes" : "no",
        e.projectCode,
        e.tags.join(", "),
        e.category,
        e.note,
        (e.tasksDone ?? []).join("; "),
        e.rateCents ? (e.rateCents / 100).toFixed(2) : "",
        (e.valueCents / 100).toFixed(2),
      ]),
    );

  return (
    <div className="page-stack">
      <div className="cp-toolbar">
        <SegmentedControl label="Date range" options={PRESETS} value={range} onChange={setRange} size="sm" />
        {range === "custom" ? (
          <span className="cp-toolbar__dates">
            <Input type="date" size="sm" aria-label="From" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
            <span aria-hidden="true">–</span>
            <Input type="date" size="sm" aria-label="To" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </span>
        ) : (
          <span className="cp-toolbar__range">
            <Icon name="calendar" size={14} /> {rangeLabel(r)}
          </span>
        )}
        <span className="u-spacer" />
        <Button size="sm" variant="outline" onClick={() => setTagsOpen(true)}>
          <Icon name="tag" size={14} /> {readOnly ? "Tags" : "Manage tags"}
        </Button>
        <Button size="sm" variant="outline" onClick={exportCsv} disabled={!shown.length}>
          <Icon name="download" size={14} /> Export
        </Button>
      </div>

      <div className="cp-toolbar cp-toolbar--filters">
        <Select size="sm" aria-label="VA" value={vaId} onChange={(e) => setVaId(e.target.value)} options={vas} placeholder="All VAs" />
        <Select
          size="sm"
          aria-label="Project code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          options={codes.map((c) => ({ value: c, label: c }))}
          placeholder="All project codes"
          disabled={!codes.length}
        />
        <Select
          size="sm"
          aria-label="Tag"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          options={tags.map((t) => ({ value: t, label: t }))}
          placeholder="All tags"
          disabled={!tags.length}
        />
        {(vaId || code || tag) && (
          <Button size="sm" variant="soft" onClick={() => (setVaId(""), setCode(""), setTag(""))}>
            Clear filters
          </Button>
        )}
      </div>

      {badRange && (
        <p className="text-error" role="alert">
          {badRange}
        </p>
      )}

      <StatGrid
        items={[
          { label: vaName ? `Hours · ${vaName}` : "Hours logged", value: hm(total), tone: "cyan" },
          { label: "Billable hours", value: hm(billable), tone: "purple" },
          { label: "Value (billable × VA rate)", value: formatCentsExact(value), tone: "green", glyph: "$" },
          { label: "Entries", value: String(shown.length), tone: "brand" },
        ]}
      />

      <LoadState query={journal} loadingText="Loading the VA tracker…" isEmpty={!shown.length} empty="Nothing logged for your business with these filters yet.">
        <div className="cp-days">
          {days.map(([day, entries]) => (
            <section key={day} className="card cp-day">
              <header className="cp-day__head">
                <strong>{dayHeading(day)}</strong>
                <span className="cluster cluster--8">
                  <span className="cp-day__total">{hm(entries.reduce((n, e) => n + e.seconds, 0))}</span>
                  <span className="tt-money">{formatCentsExact(entries.reduce((n, e) => n + e.valueCents, 0))}</span>
                </span>
              </header>
              <ul className="cp-entries">
                {entries.map((e) => (
                  <li key={e.id} className="cp-entry">
                    <Avatar name={e.vaName} tone={avatarTone(e.vaId)} size="sm" />
                    <span className="cp-entry__main">
                      <strong>{e.note || e.category || "Work for your business"}</strong>
                      <span className="text-small">
                        {e.vaName}
                        {e.note && e.category ? ` · ${e.category}` : ""}
                      </span>
                      <EntryLabelChips tags={e.tags} projectCode={e.projectCode} colors={tagColors} />
                      {e.kind === "countdown" && (e.tasksDone?.length ?? 0) > 0 && (
                        <ul className="tt-tasks-done" aria-label="Tasks completed">
                          {e.tasksDone!.map((t, i) => (
                            <li key={i}>
                              <Icon name="check" size={11} /> {t}
                            </li>
                          ))}
                        </ul>
                      )}
                    </span>
                    <span className="cp-entry__time">
                      {timeOf(e.startedAt)} –{" "}
                      {e.endedAt ? (
                        timeOf(e.endedAt)
                      ) : (
                        <Badge tone="green" dot size="xs">
                          Now
                        </Badge>
                      )}
                    </span>
                    <span className="cp-entry__dur">{hm(e.seconds)}</span>
                    <span className="cp-entry__value">{e.billable ? formatCentsExact(e.valueCents) : "Not billable"}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </LoadState>

      {tagsOpen && <TimeTagsModal readOnly={readOnly} onClose={() => setTagsOpen(false)} />}
    </div>
  );
}
