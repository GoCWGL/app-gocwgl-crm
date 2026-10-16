"use client";

import { Icon } from "@/components/ui";
import { CLIENT_BUSINESSES } from "@/data/admin";
import { useAdmin } from "../state/AdminContext";

/**
 * Full-screen preview of a client's portal, loaded in an iframe with
 * ?as=&biz= so the portal shows their name.
 * Before launch this should become a real read-only session for that client.
 */
export function ViewAsClient() {
  const { state, update } = useAdmin();
  const client = state.contacts.find((c) => c.id === state.viewAsId);
  if (!client) return null;

  const params = new URLSearchParams({ as: client.name, biz: CLIENT_BUSINESSES[client.id] ?? client.name });

  return (
    <div className="view-as" role="dialog" aria-modal="true" aria-label="Viewing as client">
      <div className="view-as__bar">
        <span className="view-as__icon" aria-hidden="true">
          <Icon name="eye" strokeWidth={2.2} />
        </span>
        <span className="stack stack--2 u-grow">
          <span className="kicker view-as__kicker">VIEWING AS CLIENT</span>
          <span className="text-strong">
            {client.name} <span className="u-semibold">· {client.email}</span>
          </span>
        </span>
        {client.stage !== "paid" && <span className="view-as__note">Not a paid client yet · preview only</span>}
        <button type="button" className="view-as__back" onClick={() => update({ viewAsId: 0 })}>
          Back to profile
        </button>
        <button type="button" className="view-as__exit" onClick={() => update({ viewAsId: 0, editContactId: 0 })}>
          Exit client view
        </button>
      </div>
      <iframe className="view-as__frame" src={`/portal?${params}`} title={`Client portal for ${client.name}`} />
    </div>
  );
}
