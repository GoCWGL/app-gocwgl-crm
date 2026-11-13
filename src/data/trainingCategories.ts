import type { IconName } from "@/components/ui";
import type { TrainingAudience } from "@/utils/api/models";

/** Training categories for the course editor's dropdown, grouped by the kind of work. */
export type CategoryGroup = { group: string; icon: IconName; categories: string[] };

const VA: CategoryGroup[] = [
  {
    group: "GoCWGL & onboarding",
    icon: "rocket",
    categories: ["GoCWGL onboarding", "Company policies", "Working with clients", "Client communication", "Tools & accounts setup"],
  },
  {
    group: "Admin & executive support",
    icon: "briefcase",
    categories: [
      "Email & inbox management",
      "Calendar & scheduling",
      "Data entry",
      "Documents & file management",
      "Research",
      "Travel & event planning",
      "Executive assistance",
    ],
  },
  {
    group: "Customer support",
    icon: "lifebuoy",
    categories: ["Customer service", "Live chat & help desk", "Phone & call handling", "Order & returns support"],
  },
  {
    group: "Sales & CRM",
    icon: "pipeline",
    categories: ["Lead generation", "CRM management", "GoHighLevel", "Appointment setting", "Cold outreach", "Sales follow-up"],
  },
  {
    group: "Marketing",
    icon: "send",
    categories: ["Social media management", "Content writing", "Email marketing", "SEO", "Paid ads support", "Community management"],
  },
  {
    group: "Creative",
    icon: "sparkle",
    categories: ["Graphic design & Canva", "Video editing", "Podcast production", "Presentations"],
  },
  {
    group: "Finance",
    icon: "dollar",
    categories: ["Bookkeeping", "Invoicing & billing", "Payroll", "Expense tracking", "QuickBooks & Xero"],
  },
  {
    group: "Tech & tools",
    icon: "settings",
    categories: ["Project management", "Automation & integrations", "Website management", "Funnels & landing pages", "AI tools", "Google Workspace", "Microsoft 365"],
  },
  {
    group: "Industries",
    icon: "building",
    categories: [
      "Real estate",
      "E-commerce",
      "Coaching & consulting",
      "Healthcare admin",
      "Legal admin",
      "Recruitment & HR",
      "Agencies",
      "Insurance",
      "Home services",
    ],
  },
  {
    group: "Professional skills",
    icon: "star",
    categories: ["Communication skills", "Time management", "Productivity", "Problem solving", "Security & privacy", "Reporting"],
  },
];

const CLIENT: CategoryGroup[] = [
  { group: "Getting started",
    icon: "rocket", categories: ["Welcome to GoCWGL", "Your client portal", "Account & billing"] },
  { group: "Working with your VA",
    icon: "users", categories: ["Working with your VA", "Delegating tasks", "Communication & feedback", "Sharing access safely"] },
  { group: "Your system",
    icon: "grid", categories: ["Your CRM", "Your funnels", "Reports & results", "Automations"] },
  { group: "Growing your business",
    icon: "trendUp", categories: ["Lead follow-up", "Marketing basics", "Sales process"] },
];

export const TRAINING_CATEGORIES: Record<TrainingAudience, CategoryGroup[]> = { va: VA, client: CLIENT };

/** Categories in use that aren't in the list (e.g. your own), so courses keep them. */
export function customCategories(audience: TrainingAudience, used: string[]): string[] {
  const known = new Set(TRAINING_CATEGORIES[audience].flatMap((g) => g.categories));
  return [...new Set(used.filter((c) => c && !known.has(c)))].sort();
}
