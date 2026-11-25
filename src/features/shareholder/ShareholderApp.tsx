"use client";

import Image from "next/image";
import { useState } from "react";
import logoWordmark from "@/assets/images/logo-wordmark.png";
import { AppShell, NavItem, PageHeader, ProfileButton, Sidebar, SidebarGroup } from "@/components/layout";
import { Badge, FormError, Icon, LoadState, StatGrid, Toast, type IconName } from "@/components/ui";
import { bpsPct, count, distributionLabel, documentLabel, fileSize, sharePct } from "@/data/shareholders";
import { MyAvatar } from "@/features/account/ProfilePhoto";
import { TwoStepReminder } from "@/features/account/TwoStepReminder";
import { SecuritySettings } from "@/features/admin/sections/settings/SecuritySettings";
import { useSignOutConfirm } from "@/features/auth/components/SignOutConfirm";
import type { MyPayoutOut } from "@/utils/api/models";
import { RequireShareholder } from "@/utils/auth/guards";
import { formatLong } from "@/utils/format/dates";
import { formatCents, formatCentsExact } from "@/utils/format/money";
import {
  useDownloadMyVoucher,
  useMyDistributions,
  useMyDocuments,
  useMyInvestorUpdates,
  useMyShareholding,
  useOpenMyDocument,
  useOpenMyReceipt,
} from "@/utils/hooks/useShareholders";
import { useMe } from "@/utils/hooks/useUsers";
import { ResultsCard } from "./ResultsCard";
import { UpdateBody } from "./UpdateBody";

type View = "dashboard" | "updates" | "documents" | "security";

const PAGES: Record<View, { label: string; icon: IconName; title: string; subtitle: string }> = {
  dashboard: { label: "Dashboard", icon: "trendUp", title: "Shareholder Dashboard", subtitle: "How the business is doing, your shares and your payouts." },
  updates: { label: "Updates", icon: "send", title: "Investor updates", subtitle: "What’s new, what’s hard and where you can help." },
  documents: { label: "Documents", icon: "folder", title: "Documents", subtitle: "Legal, tax and board documents shared with you." },
  security: { label: "Password & security", icon: "shield", title: "Password & security", subtitle: "Your password, 2-step verification and devices." },
};

/** A shareholder's own page: business results, their shares and their payouts (read only). */
export function ShareholderApp() {
  return (
    <RequireShareholder>
      <ShareholderLayout />
    </RequireShareholder>
  );
}

function ShareholderLayout() {
  const [view, setView] = useState<View>("dashboard");
  const [toast, setToast] = useState("");
  const me = useMe().data;
  const signOut = useSignOutConfirm();
  const name = me?.fullName || me?.email || "";
  const page = PAGES[view];
  return (
    <AppShell
      overlays={
        <>
          {signOut.dialog}
          <Toast floating message={toast} onClose={() => setToast("")} />
        </>
      }
      sidebar={
        <Sidebar
          label="Shareholder menu"
          brand={<Image src={logoWordmark} alt="GoCWGL" width={168} priority />}
          footer={
            <>
              <SidebarGroup>
                <NavItem label="Sign out" icon={<Icon name="arrowLeft" size={17} className="nav-item__icon" />} onClick={signOut.ask} />
              </SidebarGroup>
              <ProfileButton
                avatar={<MyAvatar name={name} brand ring />}
                name={name}
                subtitle="Password & security"
                active={view === "security"}
                onClick={() => setView("security")}
              />
            </>
          }
        >
          <SidebarGroup title="Shareholder">
            {(["dashboard", "updates", "documents"] as const).map((v) => (
              <NavItem key={v} label={PAGES[v].label} active={view === v} icon={<Icon name={PAGES[v].icon} size={17} className="nav-item__icon" />} onClick={() => setView(v)} />
            ))}
          </SidebarGroup>
        </Sidebar>
      }
    >
      <PageHeader
        kicker={`GOCWGL // ${page.label.toUpperCase()}`}
        title={page.title}
        subtitle={page.subtitle}
      />
      <div className="page-enter" key={view}>
        {view === "dashboard" && (
          <div className="stack stack--16">
            <TwoStepReminder onSetUp={() => setView("security")} />
            <MyDashboard />
          </div>
        )}
        {view === "updates" && <MyUpdates />}
        {view === "documents" && <MyDocuments />}
        {view === "security" && (
          <section className="card card--roomy">
            <SecuritySettings onMessage={setToast} />
          </section>
        )}
      </div>
    </AppShell>
  );
}

function MyDashboard() {
  const [year, setYear] = useState<number>();
  const query = useMyShareholding(year);
  const d = query.data;
  const mine = (cents: number) => (d && d.results.companyShares ? Math.round((cents * d.shares) / d.results.companyShares) : 0);
  const payouts = useMyDistributions().data ?? [];
  const sum = (which: "paid" | "due") => payouts.reduce((t, p) => t + ((p.status === "paid") === (which === "paid") ? p.netCents : 0), 0);
  return (
    <LoadState query={query} loadingText="Loading your dashboard…">
      {d && (
        <>
          <StatGrid
            items={[
              { label: "Your shares", value: d.shares.toLocaleString("en-US"), tone: "cyan", glyph: "#" },
              { label: "Your ownership", value: sharePct(d.shares, d.results.companyShares), tone: "purple", glyph: "%" },
              { label: "Payouts received", value: formatCents(sum("paid"), d.results.currency), tone: "green", glyph: "$" },
              { label: "Payouts to come", value: formatCents(sum("due"), d.results.currency), tone: "amber", glyph: "$" },
            ]}
          />
          <StatGrid
            items={[
              { label: `Your share of net income ${d.results.year}`, value: formatCents(mine(d.results.netIncomeCents), d.results.currency), tone: "green", glyph: "$" },
              { label: "Your share of net income, all time", value: formatCents(mine(d.results.retainedCents), d.results.currency), tone: "purple", glyph: "$" },
            ]}
          />
          <span className="text-small">Net income, after what’s been distributed, times your ownership. It’s paid only when a distribution is declared.</span>
          <ResultsCard results={d.results} onYear={setYear} />
          <MyPayouts payouts={payouts} />
        </>
      )}
    </LoadState>
  );
}

/** Their part of each distribution: gross, tax and net, with the voucher and receipt once it's paid. */
function MyPayouts({ payouts }: { payouts: MyPayoutOut[] }) {
  const voucher = useDownloadMyVoucher();
  const receipt = useOpenMyReceipt();
  return (
    <section className="card stack stack--14" aria-label="Your payouts">
      <div className="section-head">
        <span className="kicker">YOUR PAYOUTS · {payouts.length}</span>
      </div>
      <FormError error={voucher.error ?? receipt.error} />
      {payouts.length ? (
        <div className="table-scroll">
          <table className="data-table data-table--plain">
            <thead>
              <tr>
                <th>Distribution</th>
                <th>Your shares then</th>
                <th>Gross</th>
                <th>Tax withheld</th>
                <th>Net</th>
                <th>Status</th>
                <th className="data-table__actions">Documents</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="stack stack--2">
                      <span className="u-strong u-ink">{p.title}</span>
                      <span className="text-small">
                        {distributionLabel(p.kind)} · record date {formatLong(p.recordDate)}
                      </span>
                      {p.note && <span className="text-small">{p.note}</span>}
                    </div>
                  </td>
                  <td>
                    {count(p.shares)} ({sharePct(p.shares, p.totalShares)})
                  </td>
                  <td className="data-table__mono">{formatCentsExact(p.grossCents, p.currency)}</td>
                  <td className="data-table__mono">
                    {formatCentsExact(p.taxCents, p.currency)} ({bpsPct(p.taxBps)})
                  </td>
                  <td className="data-table__mono u-strong">{formatCentsExact(p.netCents, p.currency)}</td>
                  <td>
                    <div className="stack stack--4">
                      <Badge tone={p.status === "paid" ? "green" : "cyan"}>
                        {p.status === "paid" ? `Paid ${formatLong(p.paidOn)}` : `Expected ${formatLong(p.paymentDate)}`}
                      </Badge>
                      {p.reference && <span className="text-small">Ref. {p.reference}</span>}
                    </div>
                  </td>
                  <td className="data-table__actions">
                    {p.status === "paid" ? (
                      <>
                        <button type="button" className="row-action row-action--brand" disabled={voucher.isPending} onClick={() => voucher.mutate({ id: p.id, title: p.title })}>
                          Voucher
                        </button>
                        {p.hasReceipt && (
                          <button type="button" className="row-action row-action--brand" disabled={receipt.isPending} onClick={() => receipt.mutate(p.id)}>
                            Receipt
                          </button>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">No payouts yet.</div>
      )}
    </section>
  );
}

function MyUpdates() {
  const query = useMyInvestorUpdates();
  return (
    <LoadState query={query} isEmpty={!query.data?.length} empty="No updates yet.">
      <div className="stack stack--16">
        {query.data?.map((u) => (
          <article key={u.id} className="card stack stack--14">
            <div className="section-head">
              <span className="kicker">
                {u.cadence.toUpperCase()} · {u.period.toUpperCase()}
              </span>
              <span className="text-small">{formatLong(u.publishedAt)}</span>
            </div>
            <h3>{u.title}</h3>
            <UpdateBody update={u} />
          </article>
        ))}
      </div>
    </LoadState>
  );
}

function MyDocuments() {
  const query = useMyDocuments();
  const open = useOpenMyDocument();
  return (
    <LoadState query={query} isEmpty={!query.data?.length} empty="No documents have been shared with you yet.">
      <section className="card stack stack--14" aria-label="Documents">
        <FormError error={open.error} />
        <div className="table-scroll">
          <table className="data-table data-table--plain">
            <thead>
              <tr>
                <th>Document</th>
                <th>Kind</th>
                <th>Date</th>
                <th className="data-table__actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {query.data?.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="stack stack--2">
                      <span className="u-strong u-ink">{d.title}</span>
                      <span className="text-small">
                        {d.fileName} · {fileSize(d.fileSize)}
                      </span>
                    </div>
                  </td>
                  <td>{documentLabel(d.category)}</td>
                  <td>{d.documentDate ? formatLong(d.documentDate) : "—"}</td>
                  <td className="data-table__actions">
                    <button type="button" className="row-action row-action--brand" disabled={open.isPending} aria-label={`Open ${d.title}`} onClick={() => open.mutate(d)}>
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </LoadState>
  );
}
