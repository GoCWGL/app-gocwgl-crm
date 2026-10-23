"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, FormError, Icon, IconTile, Input, Modal, Select } from "@/components/ui";
import { useAllContacts } from "@/utils/hooks/useContacts";
import { useProjects, useStartProject } from "@/utils/hooks/useDelivery";
import { contactName } from "../../lib/contacts";
import { useAdmin } from "../../state/AdminContext";
import { ChecklistOptions, type TemplateKey } from "./ChecklistPicker";

export function NewBuildModal() {
  const { state, update } = useAdmin();
  if (!state.newBuildOpen) return null;
  return <NewBuildForm initialContactId={state.newBuildContactId} onClose={() => update({ newBuildOpen: false, newBuildContactId: "" })} />;
}

/** Start a build by hand for any client (not only paid ones), picking the checklist and dates.
 * A client can have several builds at once (e.g. a second funnel, or a CRM). */
function NewBuildForm({ initialContactId, onClose }: { initialContactId: string; onClose: () => void }) {
  const { update } = useAdmin();
  const contacts = useAllContacts();
  const projects = useProjects();
  const start = useStartProject();
  const [contactId, setContactId] = useState(initialContactId);
  const [template, setTemplate] = useState<TemplateKey>("foundation");
  const [pkg, setPkg] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [tried, setTried] = useState(false);

  // Paid clients first. Each option says how many builds the client already has.
  const builds = (projects.data ?? []).filter((p) => p.contactId === contactId);
  const countOf = (id: string) => (projects.data ?? []).filter((p) => p.contactId === id).length;
  const available = (contacts.data ?? [])
    .map((c) => {
      const name = c.company ? `${contactName(c)} · ${c.company}` : contactName(c);
      const n = countOf(c.id);
      return { value: c.id, name, label: n ? `${name} (${n} ${n === 1 ? "build" : "builds"})` : name, paid: c.stage === "paid" };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const paid = available.filter((c) => c.paid);
  const others = available.filter((c) => !c.paid);
  const name = available.find((c) => c.value === contactId)?.name ?? "";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!contactId) return setTried(true);
    start.mutate(
      { contactId, template, package: pkg.trim() || null, startDate: startDate || null, dueDate: dueDate || null },
      {
        onSuccess: (project) =>
          update({ newBuildOpen: false, newBuildContactId: "", projectId: project.id, toast: `${project.package} started for ${name}.` }),
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      onSubmit={submit}
      titleId="nb-title"
      kicker="BUILD PROGRESS"
      title="New build"
      width={640}
      media={
        <IconTile brand size="lg">
          <Icon name="plus" size={18} />
        </IconTile>
      }
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={start.isPending}>
            {start.isPending ? "Starting…" : "Start build"}
          </Button>
        </>
      }
    >
      <span className="kicker">01 · CLIENT</span>
      <Field
        label="Client"
        htmlFor="nb-client"
        required
        hint={
          contacts.isPending
            ? "Loading clients…"
            : builds.length
              ? `Already has: ${builds.map((b) => b.package).join(", ")}. This adds another build.`
              : undefined
        }
      >
        <Select
          id="nb-client"
          value={contactId}
          placeholder="Choose a client…"
          disabled={contacts.isPending}
          aria-invalid={tried && !contactId}
          onChange={(e) => {
            setContactId(e.target.value);
            if (start.isError) start.reset();
          }}
        >
          {paid.length > 0 && (
            <optgroup label="Paid clients">
              {paid.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          )}
          {others.length > 0 && (
            <optgroup label="Other contacts">
              {others.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          )}
        </Select>
      </Field>
      <FormError error={contacts.error} />

      <span className="kicker">02 · CHECKLIST</span>
      <ChecklistOptions value={template} onChange={setTemplate} />

      <span className="kicker">03 · DETAILS</span>
      <Field label="Build name" htmlFor="nb-package" hint="Leave blank to use the checklist's name. Name it so you can tell their builds apart (e.g. Webinar funnel).">
        <Input id="nb-package" maxLength={120} placeholder="e.g. Full Bundle funnel" value={pkg} onChange={(e) => setPkg(e.target.value)} />
      </Field>
      <div className="form-grid">
        <Field label="Start date" htmlFor="nb-start" hint="Defaults to today.">
          <Input id="nb-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="Target launch" htmlFor="nb-due">
          <Input id="nb-due" type="date" min={startDate || undefined} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
      </div>

      {tried && !contactId && (
        <p className="text-error" role="alert">
          Please choose a client.
        </p>
      )}
      <FormError error={start.error} />
    </Modal>
  );
}
