"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Avatar, Dropdown, Icon, LoadState } from "@/components/ui";
import { avatarTone } from "@/lib/tones";
import { SessionSplash } from "@/utils/auth/guards";
import { isStaffAdmin, setViewAsVa, useSession } from "@/utils/auth/session";
import { useVas } from "@/utils/hooks/useVas";
import { useVa } from "../state/VaContext";

/** Every VA-portal query key starts with "va": dropping them keeps one VA's data out of another's portal. */
const VA_DATA = { queryKey: ["va"] };

const urlFor = (vaId: string, tab: string | null) => `/va?as=${vaId}${tab ? `&tab=${tab}` : ""}`;

/**
 * Staff opening /va: `?as=<id>` → that VA's portal ("View as VA"); no VA yet → the first active VA.
 * VAs themselves pass straight through.
 */
export function StaffVaGate({ children }: { children: ReactNode }) {
  const { user, viewAsVaId } = useSession();
  const params = useSearchParams();
  const as = params?.get("as") ?? "";
  const queryClient = useQueryClient();
  const staff = !!user?.isStaff;

  useEffect(() => {
    if (!staff || as === (viewAsVaId ?? "")) return;
    queryClient.removeQueries(VA_DATA);
    setViewAsVa(as || null);
  }, [staff, as, viewAsVaId, queryClient]);

  // Leaving the VA portal ends "View as VA".
  useEffect(() => {
    if (!staff) return;
    return () => {
      setViewAsVa(null);
      queryClient.removeQueries(VA_DATA);
    };
  }, [staff, queryClient]);

  if (!staff) return <>{children}</>;
  if (!as) return <OpenFirstVa tab={params?.get("tab") ?? null} />;
  if (as !== viewAsVaId) return <SessionSplash text="Opening the VA’s portal…" />;
  return <>{children}</>;
}

/** Staff with no VA chosen: open the first active VA (any VA if none are active). */
function OpenFirstVa({ tab }: { tab: string | null }) {
  const router = useRouter();
  const vas = useVas();
  const list = vas.data?.vas ?? [];
  const first = list.find((v) => v.status === "active") ?? list[0];

  useEffect(() => {
    if (first) router.replace(urlFor(first.id, tab));
  }, [first, router, tab]);

  if (vas.isSuccess && !list.length) {
    return (
      <div className="session-splash">
        <div className="card stack stack--8 va-gate-empty">
          <strong>No VAs yet</strong>
          <span className="text-small">Add a VA from People › VAs, then open the VA portal to see it the way they do.</span>
          <a className="btn btn--primary" href="/admin?tab=vas">
            Go to VAs
          </a>
        </div>
      </div>
    );
  }
  return (
    <LoadState query={vas} loadingText="Opening the VA portal…">
      <SessionSplash text="Opening the VA portal…" />
    </LoadState>
  );
}

/** The bar staff see at the top of the VA portal: whose portal this is, a VA switcher, and what they can do. */
export function StaffVaBar() {
  const { user, viewAsVaId } = useSession();
  const router = useRouter();
  const tab = useSearchParams()?.get("tab") ?? null;
  const vas = useVas();
  const va = useVa();
  if (!user?.isStaff || !viewAsVaId) return null;
  const list = vas.data?.vas ?? [];
  const current = list.find((v) => v.id === viewAsVaId);
  const canAct = isStaffAdmin(user);

  return (
    <div className="staff-va-bar" role="status">
      <span className="staff-va-bar__label">
        <Icon name="eye" size={14} /> Viewing as
      </span>
      <Dropdown
        label="Switch VA"
        value={viewAsVaId}
        onChange={(id) => router.replace(urlFor(id, tab))}
        items={list.map((v) => ({
          value: v.id,
          label: v.fullName,
          meta: v.status,
          lead: <Avatar name={v.fullName} tone={avatarTone(v.id)} size="sm" />,
          section: undefined,
        }))}
        className="staff-va-bar__pick"
      >
        {current && <Avatar name={current.fullName} tone={avatarTone(current.id)} size="sm" />}
        <strong>{current?.fullName ?? "VA"}</strong>
      </Dropdown>
      <span className={`staff-va-bar__mode${canAct ? "" : " is-readonly"}`}>
        {canAct ? "You can do anything this VA can. Changes are logged under your name." : "View only for your role."}
      </span>
      <span className="staff-va-bar__links">
        <a className="btn btn--sm btn--outline" href={`/admin?tab=vas&va=${viewAsVaId}`}>
          <Icon name="user" size={13} /> VA profile
        </a>
        <button
          type="button"
          className="btn btn--sm btn--outline"
          aria-current={va.tab === "resume" ? "page" : undefined}
          onClick={() => va.goTo("resume")}
        >
          <Icon name="journal" size={13} /> Resume
        </button>
      </span>
    </div>
  );
}
