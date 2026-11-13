import type { IconName } from "@/components/ui";

// =============================================================================
// VA portal copy and menu (pure UI constants). The VA portal is its own app at
// /va, separate from the admin CRM (/admin) and the client portal (/portal).
// =============================================================================

export type VaTab =
  | "dashboard"
  | "clients"
  | "tasks"
  | "time"
  | "invoices"
  | "jobs"
  | "training"
  | "feedback"
  | "referrals"
  | "sops"
  | "support"
  | "resume"
  /** Profile & settings: opened from the name at the bottom of the menu (not a menu item). */
  | "account";

export const VA_PAGES: Record<VaTab, { title: string; subtitle: string; empty: string }> = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Your week at a glance: clients, hours and what's next.",
    empty: "",
  },
  tasks: {
    title: "Tasks",
    subtitle: "Tasks your clients asked for and assigned to you. Move each one along as you work on it.",
    empty: "No tasks yet. When a client requests a task and picks you, it shows up here.",
  },
  clients: {
    title: "Clients",
    subtitle: "The businesses you support now, and the ones you used to, with your hours and earnings for each.",
    empty: "No clients assigned to you yet. Once GoCWGL places you with a client, they'll show up here.",
  },
  time: {
    title: "Time tracker",
    subtitle: "Track your time per client and see your earnings. Your clients see the same time in their VA tracker.",
    empty: "No time logged yet. Your tracked hours will show up here, grouped by client and week.",
  },
  invoices: {
    title: "Invoices",
    subtitle: "Monthly statements built from your billable hours and rates.",
    empty: "No invoices yet. Invoices built from your tracked hours will show up here.",
  },
  jobs: {
    title: "Open jobs",
    subtitle: "Client roles you can apply for.",
    empty: "No open jobs right now. New roles from GoCWGL clients will be posted here.",
  },
  training: {
    title: "Training",
    subtitle: "Courses and lessons to grow your skills.",
    empty: "No training assigned yet. Courses from GoCWGL will show up here.",
  },
  feedback: {
    title: "Feedback",
    subtitle: "How your clients rate your work.",
    empty: "No feedback yet. Reviews from your clients will show up here.",
  },
  referrals: {
    title: "Referrals",
    subtitle: "Refer other VAs to GoCWGL and track your bonuses.",
    empty: "No referrals yet. People you refer will show up here.",
  },
  sops: {
    title: "SOP library",
    subtitle: "Step-by-step guides for the work you do.",
    empty: "No SOPs yet. Standard operating procedures shared with you will show up here.",
  },
  account: {
    title: "Profile & settings",
    subtitle: "Your details, password and security. Sign out from here too.",
    empty: "",
  },
  resume: {
    title: "Resume",
    subtitle: "Your professional resume: build it here, then download it as a PDF.",
    empty: "",
  },
  support: {
    title: "Request support",
    subtitle: "Ask the GoCWGL team for help with a client, a tool or your account.",
    empty: "No support requests yet. Requests you send the GoCWGL team will show up here.",
  },
};

export const VA_NAV: Array<{ title: string; items: Array<{ tab: VaTab; label: string; icon: IconName }> }> = [
  {
    title: "Overview",
    items: [
      { tab: "dashboard", label: "Dashboard", icon: "grid" },
      { tab: "jobs", label: "Open Jobs", icon: "briefcase" },
    ],
  },
  {
    title: "Work",
    items: [
      { tab: "clients", label: "Clients", icon: "briefcase" },
      { tab: "tasks", label: "Tasks", icon: "clipboard" },
      { tab: "time", label: "Time tracker", icon: "clock" },
      { tab: "invoices", label: "Invoices", icon: "receipt" },
    ],
  },
  {
    title: "Growth",
    items: [
      { tab: "training", label: "Training", icon: "graduation" },
      { tab: "feedback", label: "Feedback", icon: "star" },
      { tab: "referrals", label: "Referrals", icon: "share" },
    ],
  },
  {
    title: "Resources",
    items: [
      { tab: "sops", label: "SOP library", icon: "clipboard" },
      { tab: "support", label: "Request Support", icon: "lifebuoy" },
      { tab: "resume", label: "Resume", icon: "user" },
    ],
  },
];
