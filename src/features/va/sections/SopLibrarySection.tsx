"use client";

import { useVaAccess } from "../lib/access";
import { useState } from "react";
import { Button, Icon, IconTile, LoadState, Modal, SearchBox } from "@/components/ui";
import type { UseQueryResult } from "@tanstack/react-query";
import type { SopOut } from "@/utils/api/models";
import { formatShort } from "@/utils/format/dates";
import { useVaSops } from "@/utils/hooks/useVaPortal";

/** VA portal › SOP library: published step-by-step guides for VAs. */
export function SopLibrarySection() {
  const va = useVaAccess().ready;
  const query = useVaSops(va);
  return <SopLibrary query={query} />;
}

/** Searchable SOP cards with a step-by-step reader (VA portal and client portal). */
export function SopLibrary({ query }: { query: UseQueryResult<SopOut[]> }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [open, setOpen] = useState<SopOut | null>(null);
  const all = query.data ?? [];
  const categories = [...new Set(all.map((s) => s.category).filter(Boolean))].sort();
  const q = search.trim().toLowerCase();
  const shown = all.filter(
    (s) => (!category || s.category === category) && (!q || `${s.title} ${s.summary} ${s.category} ${s.steps.join(" ")}`.toLowerCase().includes(q)),
  );

  return (
    <div className="page-stack">
      <div className="card card--flat board">
        <div className="course-toolbar">
          <div className="stack stack--2">
            <h3 className="course-toolbar__title">SOP library</h3>
            <span className="text-small">
              {all.length} guide{all.length === 1 ? "" : "s"} from the GoCWGL team
            </span>
          </div>
          <div className="course-toolbar__tools">
            <SearchBox label="Search SOPs" placeholder="Search SOPs" value={search} onChange={setSearch} />
          </div>
        </div>
        {categories.length > 0 && (
          <div className="course-filters">
            <div className="filter-track" role="group" aria-label="Filter by category">
              {["", ...categories].map((c) => (
                <button key={c || "all"} type="button" className="filter-pill" aria-pressed={category === c} onClick={() => setCategory(c)}>
                  {c || "All"}
                  <span className="filter-pill__count">{c ? all.filter((s) => s.category === c).length : all.length}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <LoadState query={query} loadingText="Loading SOPs…">
          {shown.length === 0 ? (
            <div className="board__empty">
              <span className="board__empty-icon tone-purple" aria-hidden="true">
                <Icon name="clipboard" size={18} />
              </span>
              <span className="text-strong">{all.length ? "No SOPs match" : "No SOPs yet"}</span>
              <span className="text-small">Step-by-step guides from the GoCWGL team show up here.</span>
            </div>
          ) : (
            <div className="va-sops">
              {shown.map((s) => (
                <button key={s.id} type="button" className="va-sop" onClick={() => setOpen(s)}>
                  <IconTile tone="purple" size="md">
                    <Icon name="clipboard" size={16} />
                  </IconTile>
                  <span className="stack stack--4 u-grow u-minw0">
                    {s.category && <span className="kicker kicker--sm kicker--muted">{s.category.toUpperCase()}</span>}
                    <span className="text-strong">{s.title}</span>
                    {s.summary && <span className="text-small">{s.summary}</span>}
                    <span className="va-sop__meta">
                      {s.steps.length} step{s.steps.length === 1 ? "" : "s"}
                      {s.videoUrl && (
                        <>
                          {" · "}
                          <Icon name="video" size={11} /> video
                        </>
                      )}
                      {" · "}updated {formatShort(s.publishedAt ?? s.createdAt)}
                    </span>
                  </span>
                  <Icon name="chevronRight" size={15} />
                </button>
              ))}
            </div>
          )}
        </LoadState>
      </div>
      {open && <SopReader sop={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function SopReader({ sop, onClose }: { sop: SopOut; onClose: () => void }) {
  return (
    <Modal
      open
      variant="drawer"
      width={640}
      onClose={onClose}
      titleId="va-sop"
      kicker={`SOP${sop.category ? ` · ${sop.category.toUpperCase()}` : ""}`}
      title={sop.title}
      subtitle={sop.summary || undefined}
      media={
        <IconTile tone="purple" size="lg">
          <Icon name="clipboard" size={18} />
        </IconTile>
      }
      footer={
        <>
          <span className="u-spacer" />
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <div className="stack stack--16">
        {sop.videoUrl && (
          <a className="link-card" href={sop.videoUrl} target="_blank" rel="noopener noreferrer">
            <span className="link-card__icon" aria-hidden="true">
              <Icon name="video" size={17} />
            </span>
            <span className="stack stack--2 u-grow">
              <span className="text-strong">Watch the walkthrough</span>
              <span className="text-small">{sop.videoUrl.replace(/^https?:\/\//, "")}</span>
            </span>
            <Icon name="arrowRight" size={15} />
          </a>
        )}
        <div className="stack stack--8">
          <span className="kicker">STEPS · {sop.steps.length}</span>
          {sop.steps.length ? (
            <ol className="sop-steps">
              {sop.steps.map((step, i) => (
                <li key={i}>
                  <span className="sop-steps__n">{i + 1}</span>
                  <span className="va-pre">{step}</span>
                </li>
              ))}
            </ol>
          ) : (
            <span className="vp-empty">No steps.</span>
          )}
        </div>
        {sop.body && (
          <div className="stack stack--8">
            <span className="kicker">NOTES</span>
            <p className="va-pre">{sop.body}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
