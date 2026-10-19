import type { IconName } from "@/components/ui";

// =============================================================================
// Account settings, team and domains.
// =============================================================================

export type SettingsTab = "profile" | "business" | "team" | "domains" | "notif" | "security";

export const SETTINGS_TABS: Array<{ id: SettingsTab; label: string; icon: IconName; kicker: string; heading: string; blurb: string }> = [
  { id: "profile", label: "Profile", icon: "user", kicker: "YOUR PROFILE", heading: "Profile", blurb: "How you appear to your team and clients." },
  { id: "business", label: "Business", icon: "building", kicker: "BUSINESS", heading: "Business details", blurb: "Used on invoices, emails, forms and booking pages." },
  { id: "team", label: "Team", icon: "users", kicker: "TEAM", heading: "Team members", blurb: "Invite people who help you run the CRM and choose what they can do." },
  { id: "domains", label: "Domains", icon: "globe", kicker: "DOMAINS", heading: "Domains & subdomains", blurb: "Put your forms, booking pages and client pages on your own web address." },
  { id: "notif", label: "Notifications", icon: "bell", kicker: "NOTIFICATIONS", heading: "Notifications", blurb: "Choose what the CRM tells you about." },
  { id: "security", label: "Security", icon: "shield", kicker: "SECURITY", heading: "Security", blurb: "Keep your account safe." },
];

/** Time zones the pickers offer (IANA names, which the API requires). */
export const TIME_ZONES = [
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)" },
  { value: "America/Chicago", label: "Central Time (US & Canada)" },
  { value: "America/New_York", label: "Eastern Time (US & Canada)" },
  { value: "Asia/Manila", label: "Manila (GMT+8)" },
  { value: "Asia/Singapore", label: "Singapore (GMT+8)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "UTC", label: "UTC" },
];

export const CURRENCIES = [
  { value: "USD", label: "USD — US dollar" },
  { value: "PHP", label: "PHP — Philippine peso" },
  { value: "AUD", label: "AUD — Australian dollar" },
  { value: "GBP", label: "GBP — British pound" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "CAD", label: "CAD — Canadian dollar" },
  { value: "SGD", label: "SGD — Singapore dollar" },
];

/** Team alert switches. `defaultOn` mirrors the backend's defaults for a key that was never saved. */
export const NOTIFICATION_OPTIONS = [
  { key: "lead", label: "New lead signs up", desc: "When someone submits one of your forms", defaultOn: true },
  { key: "booked", label: "Call booked", desc: "When a lead books a call on any calendar", defaultOn: true },
  { key: "paid", label: "Payment received", desc: "When a client pays a subscription", defaultOn: true },
  { key: "bug", label: "New bug reported", desc: "When a client reports a bug from their CRM", defaultOn: true },
  { key: "form", label: "Every form submission", desc: "Includes newsletter and other non-lead forms", defaultOn: false },
  { key: "digest", label: "Daily summary email", desc: "One email each morning with yesterday’s numbers", defaultOn: true },
];

export const TEAM_ROLES: Array<{ value: "owner" | "admin" | "sales" | "viewer"; label: string }> = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "sales", label: "Sales" },
  { value: "viewer", label: "Viewer" },
];

// ------------------------------------------------------------------ Domains
export type DomainPurpose = "all" | "forms" | "booking" | "progress" | "email";
export type DomainStatus = "Verified" | "Pending DNS" | "Failed";

export const DOMAIN_PURPOSES: Array<{ value: DomainPurpose; label: string; short: string }> = [
  { value: "all", label: "Everything (forms, booking, progress pages)", short: "everything" },
  { value: "forms", label: "Forms and landing pages", short: "forms & landing pages" },
  { value: "booking", label: "Booking pages", short: "booking pages" },
  { value: "progress", label: "Client progress pages", short: "client progress pages" },
  { value: "email", label: "Sending email", short: "sending email" },
];

/** Shown as a hint; the API has the final list. */
export const RESERVED_SUBDOMAINS = ["www", "app", "admin", "mail", "api", "portal", "login", "static", "cdn"];
