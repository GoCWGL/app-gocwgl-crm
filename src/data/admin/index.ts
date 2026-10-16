export * from "./billing";
export * from "./calendar";
export * from "./contacts";
export * from "./delivery";
export * from "./marketing";
export * from "./settings";
export * from "./support";

/** Every page in the admin CRM. */
export type AdminTab =
  | "dashboard"
  | "clients"
  | "tags"
  | "pipeline"
  | "calendar"
  | "payments"
  | "progress"
  | "media"
  | "email"
  | "forms"
  | "automation"
  | "reporting"
  | "bugs"
  | "settings";

export const ADMIN_PAGES: Record<AdminTab, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Everyone who signed up on your landing page, and where they are now." },
  clients: { title: "Clients", subtitle: "Every lead and client captured from your landing page." },
  tags: { title: "Tags", subtitle: "Create and manage the tags you use on your contacts." },
  pipeline: { title: "Pipeline", subtitle: "Move each lead from signup to paid subscriber." },
  calendar: { title: "Calendar", subtitle: "Discovery calls booked by your leads." },
  payments: { title: "Payments", subtitle: "Subscription payments from your clients." },
  progress: { title: "Build Progress", subtitle: "Track the system you are building for each paid client and share the progress with them." },
  media: { title: "Client Media", subtitle: "One media folder per client. Files your clients upload from their portal land here." },
  email: { title: "Email", subtitle: "Send emails to one contact, a tag or a whole pipeline stage." },
  forms: { title: "Forms", subtitle: "Build forms for your landing pages. Every submission lands in your CRM." },
  automation: { title: "Automation", subtitle: "Workflows that run when a lead signs up, books or pays." },
  reporting: { title: "Reporting", subtitle: "How well signups turn into calls and paying subscribers." },
  bugs: { title: "Report Bugs", subtitle: "Every bug your clients report from their own CRM, in one place." },
  settings: { title: "Settings", subtitle: "Your profile, business details, team and preferences." },
};

/** The Clients page has three views, each with its own title. */
export type ContactView = "all" | "active" | "inactive";

export const CONTACT_VIEWS: Record<ContactView, { title: string; subtitle: string }> = {
  all: { title: "All Contacts", subtitle: "Everyone captured from your landing pages, forms and manual entries." },
  active: { title: "Active Clients", subtitle: "Clients who are currently paying for their subscription." },
  inactive: { title: "Inactive Clients", subtitle: "Lost leads, paused subscriptions and clients who stopped paying." },
};
