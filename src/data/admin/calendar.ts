import type { Tone } from "@/lib/tones";

// =============================================================================
// Booking calendars, weekly availability and connected calendars.
// =============================================================================

export type BookingCalendar = {
  id: string;
  name: string;
  /** Minutes. */
  dur: number;
  loc: string;
  /** Hex color chosen from CALENDAR_SWATCHES. */
  color: string;
  slug: string;
  on: boolean;
  desc: string;
  /** Custom weekly hours for this calendar; when unset it uses the shared availability. */
  hours?: DayAvailability[];
};

export const INITIAL_CALENDARS: BookingCalendar[] = [
  {
    id: "discovery", name: "Discovery Call", dur: 30, loc: "Google Meet", color: "#0891B2", slug: "discovery-call", on: true,
    desc: "A free intro call for new leads from the landing page. We will talk about your goals and whether the subscription is a fit.",
  },
  { id: "onboarding", name: "Client Onboarding", dur: 60, loc: "Zoom", color: "#7C3AED", slug: "onboarding", on: true, desc: "Kick-off session for new paying clients." },
  { id: "strategy", name: "Monthly Strategy Session", dur: 45, loc: "Zoom", color: "#0F9488", slug: "strategy-session", on: true, desc: "Monthly check-in for active subscribers." },
  { id: "support", name: "Quick Support Call", dur: 15, loc: "Phone call", color: "#EA580C", slug: "support", on: false, desc: "Short call for quick questions." },
];

export const CALENDAR_SWATCHES = [
  { name: "Blue", hex: "#0891B2" },
  { name: "Purple", hex: "#7C3AED" },
  { name: "Teal", hex: "#0F9488" },
  { name: "Orange", hex: "#EA580C" },
  { name: "Pink", hex: "#DB2777" },
  { name: "Green", hex: "#15803D" },
];

export const DURATIONS = ["15", "30", "45", "60", "90"];
export const LOCATIONS = ["Google Meet", "Zoom", "Phone call", "In person"];

export type DayAvailability = { d: string; on: boolean; start: string; end: string };

export const INITIAL_AVAILABILITY: DayAvailability[] = [
  { d: "Mon", on: true, start: "09:00", end: "17:00" },
  { d: "Tue", on: true, start: "09:00", end: "17:00" },
  { d: "Wed", on: true, start: "09:00", end: "17:00" },
  { d: "Thu", on: true, start: "09:00", end: "17:00" },
  { d: "Fri", on: true, start: "09:00", end: "15:00" },
  { d: "Sat", on: false, start: "10:00", end: "14:00" },
  { d: "Sun", on: false, start: "10:00", end: "14:00" },
];

/** Busy times in connected calendars, by provider and October date. */
export const BUSY_TIMES: Record<string, Record<number, string[]>> = {
  google: { 15: ["1:00 PM", "1:30 PM"], 16: ["10:00 AM", "10:30 AM"] },
  outlook: { 20: ["9:00 AM", "9:30 AM", "10:00 AM"] },
  apple: { 21: ["3:00 PM"] },
};

// --------------------------------------------------------- Calendar sync
export type CalendarProviderField = { key: string; label: string; type: string; placeholder: string };

export type CalendarProvider = {
  id: string;
  name: string;
  desc: string;
  initials: string;
  tone: Tone;
  /** Signs in with OAuth instead of a password. */
  oauth: boolean;
  readOnly?: boolean;
  help: string;
  fields: CalendarProviderField[];
};

export const CALENDAR_PROVIDERS: CalendarProvider[] = [
  {
    id: "google", name: "Google Calendar", desc: "Gmail and Google Workspace", initials: "G", tone: "cyan", oauth: true,
    help: "You will be sent to Google to sign in and allow access. We only read busy times and add bookings.",
    fields: [{ key: "account", label: "Google account email", type: "email", placeholder: "you@gmail.com" }],
  },
  {
    id: "outlook", name: "Outlook / Microsoft 365", desc: "Outlook.com, Hotmail and Office 365", initials: "O", tone: "sky", oauth: true,
    help: "You will be sent to Microsoft to sign in and allow calendar access.",
    fields: [{ key: "account", label: "Microsoft account email", type: "email", placeholder: "you@outlook.com" }],
  },
  {
    id: "apple", name: "Apple iCloud Calendar", desc: "iPhone, iPad and Mac calendars", initials: "", tone: "slate", oauth: false,
    help: "Apple needs an app-specific password. Create one at appleid.apple.com › Sign-In and Security › App-Specific Passwords.",
    fields: [
      { key: "account", label: "Apple ID email", type: "email", placeholder: "you@icloud.com" },
      { key: "secret", label: "App-specific password", type: "password", placeholder: "xxxx-xxxx-xxxx-xxxx" },
    ],
  },
  {
    id: "exchange", name: "Microsoft Exchange", desc: "Company Exchange servers", initials: "Ex", tone: "purple", oauth: false,
    help: "Ask your IT team for the Exchange server address if you do not know it.",
    fields: [
      { key: "account", label: "Work email", type: "email", placeholder: "you@company.com" },
      { key: "server", label: "Server (optional)", type: "text", placeholder: "outlook.office365.com" },
      { key: "secret", label: "Password", type: "password", placeholder: "" },
    ],
  },
  {
    id: "caldav", name: "Other (CalDAV)", desc: "Zoho, Fastmail, Yahoo, Nextcloud and more", initials: "CD", tone: "brand", oauth: false,
    help: "Works with any calendar that supports CalDAV. Find the server URL in your calendar app’s settings.",
    fields: [
      { key: "server", label: "CalDAV server URL", type: "url", placeholder: "https://caldav.example.com" },
      { key: "account", label: "Username", type: "text", placeholder: "" },
      { key: "secret", label: "Password", type: "password", placeholder: "" },
    ],
  },
  {
    id: "ics", name: "ICS calendar link", desc: "Read-only feed from any app", initials: "ICS", tone: "green", oauth: false, readOnly: true,
    help: "Paste a public or secret .ics link. We check it for busy times every 15 minutes. Bookings cannot be written to it.",
    fields: [{ key: "server", label: "Calendar link (.ics)", type: "url", placeholder: "https://…/calendar.ics" }],
  },
];

export type SubCalendar = { name: string; on: boolean; color: string };

export type CalendarConnection = {
  connected: boolean;
  account: string;
  /** Block booking slots when busy in this calendar. */
  conflicts: boolean;
  synced: string;
  subs: SubCalendar[];
};

export const INITIAL_CALENDAR_CONNECTIONS: Record<string, CalendarConnection> = {
  google: {
    connected: true,
    account: "you@gmail.com",
    conflicts: true,
    synced: "Synced 2 minutes ago",
    subs: [
      { name: "Work", on: true, color: "#0891B2" },
      { name: "Personal", on: true, color: "#7C3AED" },
      { name: "Holidays", on: false, color: "#10B981" },
    ],
  },
};
