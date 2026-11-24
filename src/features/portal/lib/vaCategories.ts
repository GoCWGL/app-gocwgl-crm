import type { IconName, PickerGroup, PickerOptionInfo } from "@/components/ui";

type Category = { value: string; icon: IconName; hint: string };

/** The categories of VA a client can ask for (any package: set hours or an open project), by area. */
const GROUPS: ReadonlyArray<{ group: string; categories: Category[] }> = [
  {
    group: "Admin & operations",
    categories: [
      { value: "Admin VA", icon: "clipboard", hint: "Inbox, calendar, data entry and day-to-day admin." },
      { value: "Executive assistant", icon: "briefcase", hint: "Dedicated support for a founder or executive." },
      { value: "Project manager", icon: "pipeline", hint: "Keeps tasks, deadlines and the team on track." },
      { value: "HR & recruiting VA", icon: "userPlus", hint: "Sourcing, screening and onboarding." },
      { value: "Bookkeeping VA", icon: "receipt", hint: "Invoices, expenses and reconciliation." },
    ],
  },
  {
    group: "Customers & sales",
    categories: [
      { value: "Customer support VA", icon: "lifebuoy", hint: "Email, chat and help desk support." },
      { value: "Phone & receptionist VA", icon: "phone", hint: "Answers calls, takes messages and books appointments." },
      { value: "Sales & lead generation VA", icon: "trendUp", hint: "Prospecting, follow-ups and appointment setting." },
    ],
  },
  {
    group: "Marketing & creative",
    categories: [
      { value: "Social media VA", icon: "share", hint: "Scheduling, posting, engagement and community." },
      { value: "Marketing & ads VA", icon: "radio", hint: "Email campaigns, SEO and ads." },
      { value: "Content writer", icon: "edit", hint: "Blogs, newsletters, captions and website copy." },
      { value: "Graphic designer", icon: "sparkle", hint: "Social graphics, presentations and branding." },
      { value: "Video & podcast editor", icon: "play", hint: "Reels, YouTube videos and podcast episodes." },
    ],
  },
  {
    group: "Tech & events",
    categories: [
      { value: "Tech VA", icon: "settings", hint: "CRM, automations, integrations and tech set-up." },
      { value: "Website & funnel VA", icon: "funnel", hint: "Builds and updates websites, landing pages and funnels." },
      { value: "Zoom event assistant", icon: "video", hint: "Runs webinars, workshops and live calls behind the scenes." },
      { value: "Course & community VA", icon: "graduation", hint: "Course uploads, student support and memberships." },
    ],
  },
  {
    group: "Industry specialists",
    categories: [
      { value: "E-commerce VA", icon: "card", hint: "Product listings, orders and store support." },
      { value: "Medical or dental VA", icon: "pulse", hint: "Scheduling, insurance and patient admin." },
      { value: "Real estate VA", icon: "building", hint: "Listings, transactions and lead follow-up." },
    ],
  },
];

/** The last choice: the client writes in the category. */
export const OTHER_CATEGORY = "Other";

const CATEGORIES = GROUPS.flatMap((g) => g.categories);

/** For the category dropdown. */
export const CATEGORY_GROUPS: PickerGroup[] = [
  ...GROUPS.map((g) => ({ group: g.group, options: g.categories.map((c) => c.value) })),
  { group: "Something else", options: [OTHER_CATEGORY] },
];
export const CATEGORY_INFO: Record<string, PickerOptionInfo> = {
  ...Object.fromEntries(CATEGORIES.map((c) => [c.value, { icon: c.icon, hint: c.hint }])),
  [OTHER_CATEGORY]: { icon: "plus", hint: "Tell us the kind of VA you need." },
};

/** A saved category → what the form shows: the listed choice, or Other with the text written in. */
export function splitCategory(category: string): { choice: string; other: string } {
  if (!category) return { choice: "", other: "" };
  return CATEGORIES.some((c) => c.value === category) ? { choice: category, other: "" } : { choice: OTHER_CATEGORY, other: category };
}
