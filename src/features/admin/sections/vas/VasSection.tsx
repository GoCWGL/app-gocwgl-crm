"use client";

import { useDeferredValue, useState } from "react";
import { Badge, Button, Icon, LoadState, SearchBox, Tabs } from "@/components/ui";
import { toneClass } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { VaStatus, VaSummary } from "@/utils/api/models";
import { canWriteCrm } from "@/utils/auth/session";
import { formatShort } from "@/utils/format/dates";
import { formatCentsExact } from "@/utils/format/money";
import { useMe } from "@/utils/hooks/useUsers";
import { useVas } from "@/utils/hooks/useVas";
import { CallInviteButton } from "../../components/CallInviteButton";
import { AddVaModal } from "../../modals/AddVaModal";
import { CallInviteModal } from "../../modals/CallInviteModal";
import { LOGIN_STATUS, rateText, VA_STATUS, VA_STATUSES, vaRate, vaTab } from "../../lib/vas";
import { useAdmin } from "../../state/AdminContext";
import { VaFullProfile } from "./VaFullProfile";

/** People › VAs: Onboarding, Active and Inactive tabs; a VA's full profile replaces the list when opened. */
export function VasSection() {
  const { state } = useAdmin();
  if (state.vaFullId) return <VaFullProfile key={state.vaFullId} id={state.vaFullId} />;
  return <VaList />;
}

function VaList() {
  const { update } = useAdmin();
  const canWrite = canWriteCrm(useMe().data);
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim());
  const list = useVas(q);
  const vas = list.data?.vas ?? [];
  const [tab, setTab] = useState<VaStatus>("active");
  const [adding, setAdding] = useState(false);
  const [interviewing, setInterviewing] = useState<VaSummary | null>(null);

  const count = (s: VaStatus) => vas.filter((v) => vaTab(v) === s).length;
  const shown = vas.filter((v) => vaTab(v) === tab);

  return (
    <div className="page-stack">
      <div className="card card--flat board">
        <div className="board__bar">
          <Tabs<VaStatus>
            label="VA status"
            value={tab}
            onChange={setTab}
            options={VA_STATUSES.map((s) => {
              const meta = VA_STATUS[s];
              return { value: s, label: meta.tab, hint: meta.hint, icon: meta.icon, tone: meta.tone, count: list.isPending ? "–" : count(s) };
            })}
          />
          <div className="board__actions">
            <SearchBox label="Search VAs" value={query} onChange={setQuery} />
            {canWrite && (
              <Button variant="primary" onClick={() => setAdding(true)}>
                <Icon name="userPlus" size={14} /> Add a VA
              </Button>
            )}
          </div>
        </div>

        <LoadState query={list} loadingText="Loading VAs…">
          <div className="table-scroll">
            <table className="data-table data-table--roomy data-table--plain">
              <thead>
                <tr>
                  <th>VA</th>
                  <th>Focus</th>
                  <th>Clients</th>
                  <th>Rate</th>
                  <th>VA portal</th>
                  <th>Last sign-in</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((va) => (
                  <VaRow
                    key={va.id}
                    va={va}
                    onFull={() => update({ vaFullId: va.id, vaId: "" })}
                    onInterview={canWrite && tab === "onboarding" ? () => setInterviewing(va) : undefined}
                  />
                ))}
              </tbody>
            </table>
            {shown.length === 0 && (
              <div className="board__empty">
                <span className={cn("board__empty-icon", toneClass(VA_STATUS[tab].tone))} aria-hidden="true">
                  <Icon name={VA_STATUS[tab].icon} size={18} />
                </span>
                <span className="text-strong">{q ? `No matches for “${q}”` : `No ${VA_STATUS[tab].label.toLowerCase()} VAs yet`}</span>
                <span className="text-small">
                  {q ? "Try another name or email, or check the other tabs." : `VAs with the ${VA_STATUS[tab].label} status show up here.`}
                </span>
              </div>
            )}
          </div>
        </LoadState>
      </div>

      {adding && <AddVaModal onClose={() => setAdding(false)} />}
      {interviewing && (
        <CallInviteModal
          kind="interview"
          id={interviewing.id}
          name={interviewing.fullName}
          email={interviewing.email}
          onClose={() => setInterviewing(null)}
        />
      )}
    </div>
  );
}

type VaRowProps = {
  va: VaSummary;
  onFull: () => void;
  /** Onboarding tab: email them a link to book an interview. */
  onInterview?: () => void;
};

function VaRow({ va, onFull, onInterview }: VaRowProps) {
  const login = LOGIN_STATUS[va.loginStatus as keyof typeof LOGIN_STATUS] ?? LOGIN_STATUS.none;
  return (
    <tr>
      <td>
        <button type="button" className="cell-button" onClick={onFull}>
          <strong className="data-table__strong">{va.fullName}</strong>
          <span className="text-small">{va.email}</span>
        </button>
        {onInterview && <CallInviteButton kind="interview" name={va.fullName} onClick={onInterview} />}
      </td>
      <td>{va.headline || (va.skills.length ? va.skills.slice(0, 3).join(", ") : "—")}</td>
      <td>{va.clientCount}</td>
      <td>
        {rateText(vaRate(va).cents, (c) => formatCentsExact(c))}
        {vaRate(va).asking && (
          <span className="text-small" title="From their resume. Set what GoCWGL pays them in Edit profile.">
            {" "}
            asking
          </span>
        )}
      </td>
      <td>
        <Badge tone={login.tone} dot>
          {va.isActive ? login.label : "Deactivated"}
        </Badge>
      </td>
      <td>{va.lastLoginAt ? formatShort(va.lastLoginAt) : "Never"}</td>
      <td className="data-table__actions">
        <Button variant="outline" size="sm" onClick={onFull}>
          Full profile
        </Button>
      </td>
    </tr>
  );
}
