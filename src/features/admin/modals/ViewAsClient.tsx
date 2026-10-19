"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui";
import { refresh } from "@/utils/api/client";
import { getSession } from "@/utils/auth/session";
import { useContact } from "@/utils/hooks/useContacts";
import { VIEW_AS_TOKEN, VIEW_AS_TOKEN_REQUEST, type ViewAsTokenMessage } from "@/utils/providers";
import { contactName } from "../lib/contacts";
import { useAdmin } from "../state/AdminContext";

/**
 * Full-screen, read-only preview of a client's portal in an iframe.
 * The iframe never refreshes the session itself (two windows refreshing at once would trip the
 * stolen-token protection): it asks this window for the access token with postMessage, and the
 * portal sends `X-Client-Id: <contactId>` on every /portal/* call. The token never goes in the URL.
 */
export function ViewAsClient() {
  const { state, update } = useAdmin();
  const client = useContact(state.viewAsId).data;
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!state.viewAsId) return;
    const onMessage = async (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      if ((e.data as { type?: string })?.type !== VIEW_AS_TOKEN_REQUEST) return;
      // The iframe asks again when its copy expires (401): refresh here, in the one window that owns the session.
      if (!getSession().accessToken || (e.data as { expired?: boolean }).expired) await refresh();
      const { accessToken, user } = getSession();
      const reply: ViewAsTokenMessage = { type: VIEW_AS_TOKEN, accessToken, user };
      frame.current?.contentWindow?.postMessage(reply, window.location.origin);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [state.viewAsId]);

  if (!state.viewAsId) return null;
  const name = client ? contactName(client) : "Client";

  return (
    <div className="view-as" role="dialog" aria-modal="true" aria-label="Viewing as client">
      <div className="view-as__bar">
        <span className="view-as__icon" aria-hidden="true">
          <Icon name="eye" strokeWidth={2.2} />
        </span>
        <span className="stack stack--2 u-grow">
          <span className="kicker view-as__kicker">VIEWING AS CLIENT · READ-ONLY</span>
          <span className="text-strong">
            {name} {client && <span className="u-semibold">· {client.email}</span>}
          </span>
        </span>
        {client && client.stage !== "paid" && <span className="view-as__note">Not a paid client yet · preview only</span>}
        <button type="button" className="view-as__back" onClick={() => update({ viewAsId: "" })}>
          Back to profile
        </button>
        <button type="button" className="view-as__exit" onClick={() => update({ viewAsId: "", editContactId: "" })}>
          Exit client view
        </button>
      </div>
      <iframe
        ref={frame}
        className="view-as__frame"
        src={`/portal?as=${encodeURIComponent(state.viewAsId)}`}
        title={`Client portal for ${name}`}
      />
    </div>
  );
}
