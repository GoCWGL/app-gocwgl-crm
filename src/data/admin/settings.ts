import type { IconName } from "@/components/ui";

// =============================================================================
// Account settings, team and domains.
// =============================================================================

export type Settings = {
  name: string;
  role: string;
  company: string;
  email: string;
  phone: string;
  title: string;
  tz: string;
  website: string;
  bizEmail: string;
  bizPhone: string;
  address: string;
  currency: string;
  notifyEmail: string;
  notif: Record<string, boolean>;
};

export const INITIAL_SETTINGS: Settings = {
  name: "Christian",
  role: "Owner",
  company: "GoCWGL",
  email: "you@yourdomain.com",
  phone: "",
  title: "Founder",
  tz: "Pacific Time (US & Canada)",
  website: "https://[yourdomain].com",
  bizEmail: "hello@[yourdomain].com",
  bizPhone: "",
  address: "",
  currency: "USD",
  notifyEmail: "you@yourdomain.com",
  notif: { lead: true, booked: true, paid: true, bug: true, form: false, digest: true },
};

export type SettingsTab = "profile" | "business" | "team" | "domains" | "notif" | "security";

export const SETTINGS_TABS: Array<{ id: SettingsTab; label: string; icon: IconName; kicker: string; heading: string; blurb: string }> = [
  { id: "profile", label: "Profile", icon: "user", kicker: "YOUR PROFILE", heading: "Profile", blurb: "How you appear to your team and clients." },
  { id: "business", label: "Business", icon: "building", kicker: "BUSINESS", heading: "Business details", blurb: "Used on invoices, emails, forms and booking pages." },
  { id: "team", label: "Team", icon: "users", kicker: "TEAM", heading: "Team members", blurb: "Invite people who help you run the CRM and choose what they can do." },
  { id: "domains", label: "Domains", icon: "globe", kicker: "DOMAINS", heading: "Domains & subdomains", blurb: "Put your forms, booking pages and client pages on your own web address." },
  { id: "notif", label: "Notifications", icon: "bell", kicker: "NOTIFICATIONS", heading: "Notifications", blurb: "Choose what the CRM tells you about." },
  { id: "security", label: "Security", icon: "shield", kicker: "SECURITY", heading: "Security", blurb: "Keep your account safe." },
];

export const TIME_ZONES = [
  "Pacific Time (US & Canada)",
  "Mountain Time (US & Canada)",
  "Central Time (US & Canada)",
  "Eastern Time (US & Canada)",
  "Manila (GMT+8)",
  "London (GMT)",
  "Sydney (AEST)",
];

export const CURRENCIES = [
  { value: "USD", label: "USD — US dollar" },
  { value: "PHP", label: "PHP — Philippine peso" },
  { value: "AUD", label: "AUD — Australian dollar" },
  { value: "GBP", label: "GBP — British pound" },
  { value: "EUR", label: "EUR — Euro" },
];

export const NOTIFICATION_OPTIONS = [
  { key: "lead", label: "New lead signs up", desc: "When someone submits one of your forms" },
  { key: "booked", label: "Call booked", desc: "When a lead books a call on any calendar" },
  { key: "paid", label: "Payment received", desc: "When a client pays a subscription" },
  { key: "bug", label: "New bug reported", desc: "When a client reports a bug from their CRM" },
  { key: "form", label: "Every form submission", desc: "Includes newsletter and other non-lead forms" },
  { key: "digest", label: "Daily summary email", desc: "One email each morning with yesterday’s numbers" },
];

export type TeamMember = { id: number; name: string; email: string; role: string; status: "Active" | "Invited" };

export const INITIAL_TEAM: TeamMember[] = [
  { id: 1, name: "Christian", email: "you@yourdomain.com", role: "Owner", status: "Active" },
  { id: 2, name: "[Team member]", email: "teammate@[yourdomain].com", role: "Sales", status: "Active" },
];

export const TEAM_ROLES = ["Owner", "Admin", "Sales", "Viewer"];

export const SIGNED_IN_DEVICES = [
  { device: "Chrome on Mac", where: "This device", when: "Active now", current: true },
  { device: "Safari on iPhone", where: "Last seen Oct 12", when: "Oct 12", current: false },
];

// ------------------------------------------------------------------ Domains
export type DomainPurpose = "all" | "forms" | "booking" | "progress" | "email";
export type DomainStatus = "Verified" | "Pending DNS" | "Failed";

export type Domain = { id: number; host: string; purpose: DomainPurpose; status: DomainStatus; primary: boolean };

export const DOMAIN_PURPOSES: Array<{ value: DomainPurpose; label: string; short: string }> = [
  { value: "all", label: "Everything (forms, booking, progress pages)", short: "everything" },
  { value: "forms", label: "Forms and landing pages", short: "forms & landing pages" },
  { value: "booking", label: "Booking pages", short: "booking pages" },
  { value: "progress", label: "Client progress pages", short: "client progress pages" },
  { value: "email", label: "Sending email", short: "sending email" },
];

export const INITIAL_DOMAINS: Domain[] = [
  { id: 1, host: "book.yourbusiness.com", purpose: "booking", status: "Verified", primary: true },
  { id: 2, host: "go.yourbusiness.com", purpose: "forms", status: "Pending DNS", primary: false },
];

export const RESERVED_SUBDOMAINS = ["www", "app", "admin", "mail"];
