import type { Tone } from "@/lib/tones";

// =============================================================================
// Bug reports sent in by clients from their own CRM.
// =============================================================================

export type BugSeverity = "Critical" | "High" | "Medium" | "Low";
export type BugStatus = "New" | "In progress" | "Waiting on client" | "Fixed";

export type ThreadMessage = { from: string; kind: "client" | "reply" | "note"; when: string; text: string };

export type BugTicket = {
  id: number;
  title: string;
  client: string;
  reporter: string;
  email: string;
  area: string;
  sev: BugSeverity;
  status: BugStatus;
  date: string;
  device: string;
  desc: string;
  thread: ThreadMessage[];
};

export const SEVERITY_TONES: Record<BugSeverity, Tone> = { Critical: "red", High: "orange", Medium: "amber", Low: "slate" };
export const BUG_STATUS_TONES: Record<BugStatus, Tone> = { New: "cyan", "In progress": "purple", "Waiting on client": "amber", Fixed: "green" };
export const SEVERITIES: BugSeverity[] = ["Critical", "High", "Medium", "Low"];
export const BUG_STATUSES: BugStatus[] = ["New", "In progress", "Waiting on client", "Fixed"];

export const INITIAL_TICKETS: BugTicket[] = [
  {
    id: 101, title: "Booking page shows wrong time zone", client: "Bright Smile Dental", reporter: "Dana Cole",
    email: "dana@brightsmile.example", area: "Calendar", sev: "Critical", status: "New", date: "Oct 14", device: "Chrome on Windows",
    desc: "Patients in Manila see times 15 hours off on the booking page. Two people booked at 3 AM by mistake.", thread: [],
  },
  {
    id: 102, title: "Form submissions not showing in Pipeline", client: "Peak Fitness Studio", reporter: "Marco Lim",
    email: "marco@peakfit.example", area: "Forms", sev: "High", status: "In progress", date: "Oct 13", device: "Safari on iPhone",
    desc: "New signups from the trial class form appear in Clients but not in the Sales pipeline.",
    thread: [{ from: "You", kind: "reply", when: "Oct 13", text: "Thanks Marco, looking into it now. Leads are safe in Clients." }],
  },
  {
    id: 103, title: "Email template loses line breaks", client: "Luna Realty", reporter: "Ava Torres",
    email: "ava@lunarealty.example", area: "Email", sev: "Medium", status: "Waiting on client", date: "Oct 12", device: "Chrome on Mac",
    desc: "The follow-up template sends as one long paragraph.",
    thread: [{ from: "You", kind: "reply", when: "Oct 12", text: "Could you send a screenshot of the template editor?" }],
  },
  {
    id: 104, title: "Stripe payment marked as failed but went through", client: "Coastal Roofing", reporter: "Ben Hart",
    email: "ben@coastalroof.example", area: "Payments", sev: "High", status: "New", date: "Oct 12", device: "Edge on Windows",
    desc: "Client was charged $450 but the CRM shows the payment as failed.", thread: [],
  },
  {
    id: 105, title: "Drag and drop not working on tablet", client: "Peak Fitness Studio", reporter: "Marco Lim",
    email: "marco@peakfit.example", area: "Pipeline", sev: "Low", status: "New", date: "Oct 10", device: "Chrome on Android tablet",
    desc: "Cards will not move when dragged with a finger.", thread: [],
  },
  {
    id: 106, title: "Automation sent welcome email twice", client: "Mia’s Bakery", reporter: "Mia Santos",
    email: "mia@miasbakery.example", area: "Automation", sev: "Medium", status: "In progress", date: "Oct 9", device: "Chrome on Mac",
    desc: "Some new subscribers received the welcome email two times within a minute.",
    thread: [{ from: "You", kind: "note", when: "Oct 9", text: "Looks like the form trigger fires twice on slow connections." }],
  },
  {
    id: 107, title: "Tag filter shows deleted tags", client: "Luna Realty", reporter: "Ava Torres",
    email: "ava@lunarealty.example", area: "Clients", sev: "Low", status: "Fixed", date: "Oct 6", device: "Chrome on Mac",
    desc: "After deleting the “Open house” tag it still appears in the filter list.",
    thread: [{ from: "You", kind: "reply", when: "Oct 7", text: "Fixed — refresh and it should be gone." }],
  },
  {
    id: 108, title: "Dashboard MRR does not include annual plans", client: "Bright Smile Dental", reporter: "Dana Cole",
    email: "dana@brightsmile.example", area: "Dashboard", sev: "Medium", status: "Fixed", date: "Oct 3", device: "Safari on Mac",
    desc: "Annual subscriptions are not counted in monthly revenue.", thread: [],
  },
];
