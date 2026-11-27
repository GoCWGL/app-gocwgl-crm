"use client";

import { useMutation } from "@tanstack/react-query";
import { useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button, Checkbox, Dropdown, Field, FormError, Icon, IconTile, Input, Modal, Select, Textarea, type IconName } from "@/components/ui";
import { browserZone, zoneOptions } from "@/features/booking/zones";
import { isEmail } from "@/lib/utils";
import { CRM_PACKAGES, OFFERED_CRM_PACKAGES, STRATEGY_CALL_URL } from "@/data/portal";
import { applyAsClient, applyAsVa } from "@/utils/api/applications";
import { formatCents } from "@/utils/format/money";
import { fieldErrors } from "@/utils/errors";
import { useBotCheck } from "./useBotCheck";

type Kind = "client" | "va";

const OPTIONS: Array<{ kind: Kind; icon: IconName; title: string; text: string }> = [
  { kind: "client", icon: "rocket", title: "Become a client", text: "Get a CRM or a VA for your business." },
  { kind: "va", icon: "briefcase", title: "Apply as a VA", text: "Join the GoCWGL team of virtual assistants." },
];

/** Under the sign-in form: no self sign-up, but people can apply as a client or a VA. */
export function ApplyOptions() {
  const [open, setOpen] = useState<Kind | null>(null);
  const popup =
    open === "client" ? (
      <ClientApplyModal onClose={() => setOpen(null)} />
    ) : open === "va" ? (
      <VaApplyModal onClose={() => setOpen(null)} />
    ) : null;

  return (
    <section className="auth-apply" aria-label="New to GoCWGL?">
      <div className="auth-divider" aria-hidden="true">
        NEW TO GOCWGL?
      </div>
      <div className="auth-apply__options">
        {OPTIONS.map((o) => (
          <button key={o.kind} type="button" className="auth-apply__option" aria-haspopup="dialog" onClick={() => setOpen(o.kind)}>
            <IconTile tone={o.kind === "client" ? "orange" : "cyan"} size="sm">
              <Icon name={o.icon} size={15} strokeWidth={2} />
            </IconTile>
            <span className="stack stack--2 u-grow">
              <span className="auth-apply__title">{o.title}</span>
              <span className="auth-apply__text">{o.text}</span>
            </span>
            <Icon name="arrowRight" size={15} />
          </button>
        ))}
      </div>
      {/* Rendered into <body>: the sign-in card floats (CSS transform), which would
          otherwise trap these full-screen pop-ups inside the card. */}
      {popup && createPortal(popup, document.body)}
    </section>
  );
}

// ------------------------------------------------------------------ Shared pieces

/** The popup around each form: the form, or the thank-you once it's sent. */
function ApplyModal({
  kind,
  done,
  onClose,
  onSubmit,
  sending,
  canSend,
  botNote,
  children,
}: {
  kind: Kind;
  done: string;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  sending: boolean;
  canSend: boolean;
  botNote: ReactNode;
  children: ReactNode;
}) {
  const option = OPTIONS.find((o) => o.kind === kind)!;
  return (
    <Modal
      open
      className="apply-modal"
      onClose={onClose}
      onSubmit={done ? undefined : onSubmit}
      titleId={`apply-${kind}`}
      kicker={kind === "client" ? "WORK WITH GOCWGL" : "JOIN THE TEAM"}
      title={option.title}
      subtitle={done ? undefined : option.text}
      width={560}
      media={
        <IconTile brand size="lg">
          <Icon name={option.icon} size={18} />
        </IconTile>
      }
      footer={
        done ? (
          <>
            <span className="u-spacer" />
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </>
        ) : (
          <>
            {botNote}
            <span className="u-spacer" />
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={sending || !canSend}>
              {sending ? "Sending…" : kind === "client" ? "Send request" : "Send application"}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <div className="auth-apply__done" role="status">
          <span className="auth-apply__done-icon" aria-hidden="true">
            <Icon name="check" size={22} strokeWidth={2.6} />
          </span>
          <strong>{kind === "client" ? "Request sent" : "Application sent"}</strong>
          <p>{done}</p>
        </div>
      ) : (
        children
      )}
    </Modal>
  );
}

/** Hidden from people; bots fill it in and the API quietly ignores them. */
function Honeypot({ onChange }: { onChange: (v: string) => void }) {
  return (
    <input
      className="sr-only"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      name="website"
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/** "How did you hear about us?" (both forms), with an icon and accent each. */
const HEARD_FROM: Array<{ value: string; icon: IconName; color: string; section?: string }> = [
  { value: "Google search", icon: "search", color: "#4285f4", section: "Search & social" },
  { value: "Facebook", icon: "users", color: "#1877f2" },
  { value: "Instagram", icon: "sparkle", color: "#e1306c" },
  { value: "TikTok", icon: "video", color: "#0b1424" },
  { value: "YouTube", icon: "play", color: "#ff0000" },
  { value: "LinkedIn", icon: "briefcase", color: "#0a66c2" },
  { value: "A friend or referral", icon: "userPlus", color: "#10b981", section: "People & events" },
  { value: "An event or webinar", icon: "calendar", color: "#7c3aed" },
  { value: "Other", icon: "grid", color: "#4f6280" },
];

const REFERRAL = "A friend or referral";

/** What's sent as `heardFrom`: the choice, plus who referred them when it's a referral. */
const heardFromValue = (heard: string, referrer: string) =>
  heard === REFERRAL && referrer.trim() ? `${REFERRAL}: ${referrer.trim()}` : heard;

function HeardIcon({ icon, color }: { icon: IconName; color: string }) {
  return (
    <span className="apply-heard__icon" style={{ "--c": color } as CSSProperties} aria-hidden="true">
      <Icon name={icon} size={14} strokeWidth={2.2} />
    </span>
  );
}

function HeardFromField({
  id,
  value,
  onChange,
  referrer,
  onReferrerChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  referrer: string;
  onReferrerChange: (v: string) => void;
}) {
  const chosen = HEARD_FROM.find((h) => h.value === value);
  return (
    <div className="stack stack--8">
      <Field label="How did you hear about us?" htmlFor={id}>
        <Dropdown
          id={id}
          label="How did you hear about us?"
          className="apply-heard"
          menuClassName="apply-heard__menu"
          value={value}
          onChange={onChange}
          items={HEARD_FROM.map((h) => ({ value: h.value, section: h.section, label: h.value, lead: <HeardIcon icon={h.icon} color={h.color} /> }))}
        >
          {chosen ? (
            <>
              <HeardIcon icon={chosen.icon} color={chosen.color} />
              <span className="apply-heard__value">{chosen.value}</span>
            </>
          ) : (
            <>
              <span className="apply-heard__icon apply-heard__icon--empty" aria-hidden="true">
                <Icon name="globe" size={14} strokeWidth={2.2} />
              </span>
              <span className="apply-heard__value apply-heard__value--empty">Choose one</span>
            </>
          )}
        </Dropdown>
      </Field>
      {value === REFERRAL && (
        <Field label="Who referred you?" htmlFor={`${id}-who`}>
          <Input
            id={`${id}-who`}
            placeholder="Their name"
            maxLength={80}
            autoFocus
            value={referrer}
            onChange={(e) => onReferrerChange(e.target.value)}
          />
        </Field>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Become a client

const NOT_SURE = "Not sure yet";
/** The API matches this value exactly (it sets which service the new portal shows). */
const WANTS_CRM = "A CRM";

/** The "What do you need help with?" cards. Values are what the API has always received. */
const NEEDS: Array<{ value: string; icon: IconName; tone: "orange" | "cyan"; title: string; text: string }> = [
  { value: WANTS_CRM, icon: "pipeline", tone: "orange", title: "Custom CRM", text: "Leads, pipelines and follow-ups, built for your business." },
  { value: "A virtual assistant", icon: "briefcase", tone: "cyan", title: "Needs a VA", text: "Inbox, calendar, support or admin, handled for you." },
];

/** "Which CRM?" (shown once they pick Custom CRM): the packages on offer, or not sure yet. */
const CRM_CHOICES: Array<{ value: string; title: string; text: string; icon: IconName; color: string }> = [
  ...OFFERED_CRM_PACKAGES.map((k) => ({
    value: CRM_PACKAGES[k].label,
    title: CRM_PACKAGES[k].label,
    text: `${CRM_PACKAGES[k].kind} · from ${formatCents(CRM_PACKAGES[k].priceCents)}`,
    icon: (k === "growth" ? "pipeline" : "sparkle") as IconName,
    color: k === "growth" ? "#f97316" : "#7c3aed",
  })),
  { value: NOT_SURE, title: "Not sure yet", text: "We'll help you choose on a call", icon: "grid", color: "#4f6280" },
];

function CrmChoiceField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const chosen = CRM_CHOICES.find((c) => c.value === value);
  return (
    <Field label="Which CRM do you want to go with?" htmlFor="ca-crm">
      <Dropdown
        id="ca-crm"
        label="Which CRM do you want to go with?"
        className="apply-heard"
        menuClassName="apply-heard__menu"
        value={value}
        onChange={onChange}
        items={CRM_CHOICES.map((c) => ({ value: c.value, label: c.title, meta: c.text, lead: <HeardIcon icon={c.icon} color={c.color} /> }))}
      >
        {chosen ? (
          <>
            <HeardIcon icon={chosen.icon} color={chosen.color} />
            <span className="apply-heard__value">{chosen.title}</span>
          </>
        ) : (
          <>
            <span className="apply-heard__icon apply-heard__icon--empty" aria-hidden="true">
              <Icon name="pipeline" size={14} strokeWidth={2.2} />
            </span>
            <span className="apply-heard__value apply-heard__value--empty">Choose a CRM</span>
          </>
        )}
      </Dropdown>
    </Field>
  );
}

function NeedPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="apply-need">
      <div className="apply-need__head">
        <span className="apply-need__step" aria-hidden="true">
          01
        </span>
        <span className="apply-need__label" id="ca-interest">
          What do you need help with?
        </span>
      </div>
      <div className="apply-need__choices" role="radiogroup" aria-labelledby="ca-interest">
        <div className="apply-need__cards">
          {NEEDS.map((n) => (
            <button
              key={n.value}
              type="button"
              role="radio"
              aria-checked={value === n.value}
              className={`apply-need__card apply-need__card--${n.tone}`}
              onClick={() => onChange(n.value)}
            >
              <span className="apply-need__icon" aria-hidden="true">
                <Icon name={n.icon} size={18} strokeWidth={2} />
              </span>
              <span className="apply-need__title">{n.title}</span>
              <span className="apply-need__text">{n.text}</span>
              <span className="apply-need__tick" aria-hidden="true">
                <Icon name="check" size={11} strokeWidth={3.2} />
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          role="radio"
          aria-checked={value === NOT_SURE}
          className="apply-need__unsure"
          onClick={() => onChange(value === NOT_SURE ? "" : NOT_SURE)}
        >
          <Icon name={value === NOT_SURE ? "check" : "sparkle"} size={12} strokeWidth={2.4} />
          {value === NOT_SURE ? "Not sure yet: we'll help you decide" : "Not sure yet? We'll help you decide"}
        </button>
      </div>
    </div>
  );
}

function ClientApplyModal({ onClose }: { onClose: () => void }) {
  const bot = useBotCheck("apply_client");
  const honeypot = useRef("");
  const [redirecting, setRedirecting] = useState(false);
  const [tried, setTried] = useState(false);
  const [f, setF] = useState({ first: "", last: "", email: "", phone: "", company: "", site: "", interest: WANTS_CRM, crm: "", readNext: false, heard: "", referrer: "", message: "" });
  const set = (patch: Partial<typeof f>) => setF((d) => ({ ...d, ...patch }));
  const send = useMutation({ mutationFn: applyAsClient, onSettled: bot.reset });
  const api = fieldErrors(send.error);
  const siteOk = !f.site.trim() || /^https?:\/\/\S+$/.test(f.site.trim());

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!f.first.trim() || !isEmail(f.email) || !siteOk || !f.readNext || !bot.ready) return;
    const crm = f.interest === WANTS_CRM ? f.crm : "";
    send.mutate({
      firstName: f.first.trim(),
      lastName: f.last.trim(),
      email: f.email.trim(),
      phone: f.phone.trim(),
      company: f.company.trim(),
      businessWebsite: f.site.trim(),
      interest: f.interest,
      crmPackage: crm,
      heardFrom: heardFromValue(f.heard, f.referrer),
      message: f.message.trim(),
      bookCallAcknowledged: f.readNext,
      captchaToken: bot.token,
      website: honeypot.current,
    }, {
      // Picked a CRM: straight on to book the strategy call, with their choice as the booking's note.
      onSuccess: () => {
        if (!crm) return;
        setRedirecting(true);
        const call = new URL(STRATEGY_CALL_URL);
        call.searchParams.set("notes", `CRM: ${crm}`);
        window.location.assign(call.href);
      },
    });
  };

  return (
    <ApplyModal
      kind="client"
      done={redirecting ? "" : (send.data?.message ?? "")}
      onClose={onClose}
      onSubmit={submit}
      sending={send.isPending || redirecting}
      canSend={bot.ready || !tried}
      botNote={tried && !bot.ready ? <span className="field__error">{bot.message}</span> : null}
    >
      <div className="stack stack--12">
        <FormError error={Object.keys(api).length ? null : send.error} />
        <NeedPicker value={f.interest} onChange={(interest) => set({ interest })} />
        {f.interest === WANTS_CRM && <CrmChoiceField value={f.crm} onChange={(crm) => set({ crm })} />}
        <div className="form-grid">
          <Field label="First name" htmlFor="ca-first" required error={(tried && !f.first.trim() && "Enter your first name.") || api.firstName}>
            <Input id="ca-first" autoComplete="given-name" value={f.first} onChange={(e) => set({ first: e.target.value })} autoFocus />
          </Field>
          <Field label="Last name" htmlFor="ca-last">
            <Input id="ca-last" autoComplete="family-name" value={f.last} onChange={(e) => set({ last: e.target.value })} />
          </Field>
          <Field label="Email" htmlFor="ca-email" required error={(tried && !isEmail(f.email) && "Enter a valid email.") || (api.email && "Enter a valid email address.")}>
            <Input id="ca-email" type="email" autoComplete="email" value={f.email} onChange={(e) => set({ email: e.target.value })} />
          </Field>
          <Field label="Phone" htmlFor="ca-phone" error={api.phone}>
            <Input id="ca-phone" type="tel" autoComplete="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} />
          </Field>
        </div>
        <Field label="Business name" htmlFor="ca-company">
          <Input id="ca-company" autoComplete="organization" value={f.company} onChange={(e) => set({ company: e.target.value })} />
        </Field>
        <Field label="Website" htmlFor="ca-site" error={(tried && !siteOk && "Start with https://") || api.businessWebsite}>
          <Input id="ca-site" type="url" placeholder="https://" value={f.site} onChange={(e) => set({ site: e.target.value })} />
        </Field>
        <HeardFromField
          id="ca-heard"
          value={f.heard}
          onChange={(heard) => set({ heard })}
          referrer={f.referrer}
          onReferrerChange={(referrer) => set({ referrer })}
        />
        <Field label="Tell us about your business" htmlFor="ca-message">
          <Textarea
            id="ca-message"
            rows={4}
            placeholder="What you sell, who your customers are, and what you'd like GoCWGL to build or handle."
            value={f.message}
            onChange={(e) => set({ message: e.target.value })}
          />
        </Field>
        <Honeypot onChange={(v) => (honeypot.current = v)} />
        {bot.widget}
        <div className={`apply-next${tried && !f.readNext ? " apply-next--missing" : ""}`} role="note">
          <div className="apply-next__body">
            <span className="apply-next__icon" aria-hidden="true">
              <Icon name="calendar" size={16} strokeWidth={2.2} />
            </span>
            <p>
              <strong>Next: book a call with us</strong>
              {f.interest === WANTS_CRM && f.crm
                ? "Once you send your request, we'll take you to our calendar to book a strategy call about your project."
                : "Once you send your request, book a call with us to talk through your project."}
            </p>
          </div>
          <Checkbox
            brand
            className="apply-next__check"
            checked={f.readNext}
            onChange={(e) => set({ readNext: e.target.checked })}
            label="I understand: I'll book a call with GoCWGL to discuss my project."
            aria-invalid={tried && !f.readNext}
          />
          {tried && !f.readNext && <span className="field__error">Tick the box to confirm you’ve read this.</span>}
        </div>
      </div>
    </ApplyModal>
  );
}

// ------------------------------------------------------------------ Apply as a VA

function VaApplyModal({ onClose }: { onClose: () => void }) {
  const bot = useBotCheck("apply_va");
  const honeypot = useRef("");
  const [tried, setTried] = useState(false);
  const [f, setF] = useState({
    first: "",
    last: "",
    email: "",
    phone: "",
    country: "",
    timezone: browserZone("Asia/Manila"),
    headline: "",
    experience: "",
    skills: "",
    rate: "",
    portfolio: "",
    heard: "",
    referrer: "",
    about: "",
  });
  const set = (patch: Partial<typeof f>) => setF((d) => ({ ...d, ...patch }));
  const send = useMutation({ mutationFn: applyAsVa, onSettled: bot.reset });
  const api = fieldErrors(send.error);
  const rateCents = f.rate.trim() === "" ? null : Math.round(Number(f.rate) * 100);
  const rateOk = rateCents === null || (Number.isFinite(rateCents) && rateCents >= 0);
  const portfolioOk = !f.portfolio.trim() || /^https?:\/\/\S+$/.test(f.portfolio.trim());

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!f.first.trim() || !isEmail(f.email) || !rateOk || !portfolioOk || !f.experience.trim() || !bot.ready) return;
    send.mutate({
      firstName: f.first.trim(),
      lastName: f.last.trim(),
      email: f.email.trim(),
      phone: f.phone.trim(),
      country: f.country.trim(),
      timezone: f.timezone,
      headline: f.headline.trim(),
      experience: f.experience.trim(),
      skills: [...new Set(f.skills.split(",").map((s) => s.trim()).filter(Boolean))],
      hourlyRateCents: rateCents,
      portfolioUrl: f.portfolio.trim(),
      heardFrom: heardFromValue(f.heard, f.referrer),
      about: f.about.trim(),
      captchaToken: bot.token,
      website: honeypot.current,
    });
  };

  return (
    <ApplyModal
      kind="va"
      done={send.data?.message ?? ""}
      onClose={onClose}
      onSubmit={submit}
      sending={send.isPending}
      canSend={bot.ready || !tried}
      botNote={tried && !bot.ready ? <span className="field__error">{bot.message}</span> : null}
    >
      <div className="stack stack--12">
        <FormError error={Object.keys(api).length ? null : send.error} />
        <span className="kicker kicker--sm">ABOUT YOU</span>
        <div className="form-grid">
          <Field label="First name" htmlFor="va-first" required error={(tried && !f.first.trim() && "Enter your first name.") || api.firstName}>
            <Input id="va-first" autoComplete="given-name" value={f.first} onChange={(e) => set({ first: e.target.value })} autoFocus />
          </Field>
          <Field label="Last name" htmlFor="va-last">
            <Input id="va-last" autoComplete="family-name" value={f.last} onChange={(e) => set({ last: e.target.value })} />
          </Field>
          <Field label="Email" htmlFor="va-email" required error={(tried && !isEmail(f.email) && "Enter a valid email.") || (api.email && "Enter a valid email address.")}>
            <Input id="va-email" type="email" autoComplete="email" value={f.email} onChange={(e) => set({ email: e.target.value })} />
          </Field>
          <Field label="Phone" htmlFor="va-phone" error={api.phone}>
            <Input id="va-phone" type="tel" autoComplete="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} />
          </Field>
          <Field label="Country" htmlFor="va-country">
            <Input id="va-country" autoComplete="country-name" value={f.country} onChange={(e) => set({ country: e.target.value })} />
          </Field>
          <Field label="Time zone" htmlFor="va-tz">
            <Select id="va-tz" value={f.timezone} options={zoneOptions([f.timezone])} onChange={(e) => set({ timezone: e.target.value })} />
          </Field>
        </div>

        <span className="kicker kicker--sm">YOUR EXPERIENCE</span>
        <Field label="Headline" htmlFor="va-headline" hint="What you do best, in a few words.">
          <Input id="va-headline" placeholder="Inbox, calendar & customer support" value={f.headline} onChange={(e) => set({ headline: e.target.value })} />
        </Field>
        <Field label="Experience" htmlFor="va-exp" required error={tried && !f.experience.trim() ? "Tell us about your experience." : api.experience}>
          <Textarea
            id="va-exp"
            rows={4}
            placeholder="Past roles, tools and industries, e.g. 3 years supporting coaches with GoHighLevel and Canva"
            value={f.experience}
            onChange={(e) => set({ experience: e.target.value })}
          />
        </Field>
        <Field label="Skills" htmlFor="va-skills" hint="Separate with commas.">
          <Input id="va-skills" placeholder="Email, Scheduling, Canva" value={f.skills} onChange={(e) => set({ skills: e.target.value })} />
        </Field>
        <div className="form-grid">
          <Field label="Hourly rate (USD)" htmlFor="va-rate" error={tried && !rateOk ? "Enter an amount, e.g. 6.50" : api.hourlyRateCents}>
            <Input id="va-rate" inputMode="decimal" placeholder="0.00" value={f.rate} onChange={(e) => set({ rate: e.target.value })} />
          </Field>
          <Field label="Portfolio or LinkedIn" htmlFor="va-portfolio" error={(tried && !portfolioOk && "Start with https://") || api.portfolioUrl}>
            <Input id="va-portfolio" type="url" placeholder="https://" value={f.portfolio} onChange={(e) => set({ portfolio: e.target.value })} />
          </Field>
        </div>
        <HeardFromField
          id="va-heard"
          value={f.heard}
          onChange={(heard) => set({ heard })}
          referrer={f.referrer}
          onReferrerChange={(referrer) => set({ referrer })}
        />
        <Field label="Anything else?" htmlFor="va-about">
          <Textarea id="va-about" rows={3} value={f.about} onChange={(e) => set({ about: e.target.value })} />
        </Field>
        <Honeypot onChange={(v) => (honeypot.current = v)} />
        {bot.widget}
      </div>
    </ApplyModal>
  );
}
