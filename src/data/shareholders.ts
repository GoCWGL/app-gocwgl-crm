import type { BudgetLineIn, DataRoomDocumentOut, DistributionIn, DocumentPatch, EquityGrantIn, PayoutProfileIn, StakeholderIn } from "@/utils/api/models";

type Option<T> = { value: T; label: string };
const labelIn = (options: Array<Option<string>>) => (value: string) => options.find((o) => o.value === value)?.label ?? value;

/** Built in; any other category on an expense is a custom name, shown as typed. */
export const EXPENSE_CATEGORIES: Array<Option<Exclude<BudgetLineIn["line"], "income" | "bonuses">>> = [
  { value: "hosting", label: "Hosting" },
  { value: "client_hosting", label: "Client hosting" },
  { value: "domains", label: "Domains & email" },
  { value: "delivery", label: "Cost of delivery" },
  { value: "payroll", label: "Payroll" },
  { value: "software", label: "Software" },
  { value: "marketing", label: "Marketing" },
  { value: "contractors", label: "Contractors" },
  { value: "office", label: "Office" },
  { value: "taxes", label: "Taxes & fees" },
  { value: "other", label: "Other" },
];
export const expenseLabel = labelIn(EXPENSE_CATEGORIES);

export const BUDGET_LINES: Array<Option<BudgetLineIn["line"]>> = [
  { value: "income", label: "Income" },
  ...EXPENSE_CATEGORIES,
  { value: "bonuses", label: "Referral bonuses" },
];

export const STAKEHOLDER_CATEGORIES: Array<Option<StakeholderIn["category"]>> = [
  { value: "founder", label: "Founder" },
  { value: "vc", label: "VC" },
  { value: "angel", label: "Angel" },
  { value: "advisor", label: "Advisor" },
  { value: "employee", label: "Employee" },
  { value: "other", label: "Other" },
];
export const categoryLabel = labelIn(STAKEHOLDER_CATEGORIES);

export const ENTITY_TYPES: Array<Option<StakeholderIn["entityType"]>> = [
  { value: "individual", label: "Individual" },
  { value: "company", label: "Company" },
  { value: "fund", label: "Fund" },
  { value: "trust", label: "Trust" },
];
export const entityLabel = labelIn(ENTITY_TYPES);

export const TAX_STATUSES: Array<Option<NonNullable<StakeholderIn["taxStatus"]>>> = [
  { value: "missing", label: "Not requested" },
  { value: "requested", label: "Requested" },
  { value: "received", label: "Received" },
];
export const taxLabel = labelIn(TAX_STATUSES);

export const KYC_STATUSES: Array<Option<NonNullable<StakeholderIn["kycStatus"]>>> = [
  { value: "not_started", label: "Not started" },
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "expired", label: "Expired" },
];
export const kycLabel = labelIn(KYC_STATUSES);

export const SHARE_CLASSES: Array<Option<EquityGrantIn["shareClass"]>> = [
  { value: "common", label: "Common" },
  { value: "preferred", label: "Preferred" },
  { value: "option", label: "Options (ESOP)" },
  { value: "safe", label: "SAFE" },
];
export const shareClassLabel = labelIn(SHARE_CLASSES);

export const DOCUMENT_CATEGORIES: Array<Option<DocumentPatch["category"]>> = [
  { value: "incorporation", label: "Incorporation" },
  { value: "agreement", label: "Shareholder agreements" },
  { value: "security", label: "SAFEs & stock certificates" },
  { value: "board", label: "Board minutes & decks" },
  { value: "tax", label: "Tax statements" },
  { value: "other", label: "Other" },
];
export const documentLabel = labelIn(DOCUMENT_CATEGORIES);

export const MILESTONE_KINDS: Array<Option<"board" | "milestone" | "deadline">> = [
  { value: "board", label: "Board meeting" },
  { value: "milestone", label: "Milestone" },
  { value: "deadline", label: "Deadline" },
];
export const milestoneLabel = labelIn(MILESTONE_KINDS);

/** "25%" or "33.33%". */
export const sharePct = (shares: number, total: number) => (total ? `${Math.round((shares / total) * 10_000) / 100}%` : "0%");

/** What fully diluted ownership is a % of: every share, option and estimated SAFE share, or all company shares while some aren't assigned. */
export const dilutedTotal = (c: { fullyDiluted: number; companyShares: number }) => Math.max(c.fullyDiluted, c.companyShares);

export const count = (n: number) => n.toLocaleString("en-US");

/** "Nov" (or "November") from "2026-11". */
export const monthName = (key: string, month: "short" | "long" = "short") =>
  new Intl.DateTimeFormat("en-US", { month, timeZone: "UTC" }).format(new Date(`${key}-01T00:00:00Z`));

/** PDFs, images and videos open in a new tab; other documents are saved. */
export const opensInline = (d: Pick<DataRoomDocumentOut, "fileType">) =>
  d.fileType === "application/pdf" || d.fileType.startsWith("image/") || d.fileType.startsWith("video/");

export const fileSize = (bytes: number) => (bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

// ------------------------------------------------------------------ Distributions
export const DISTRIBUTION_KINDS: Array<Option<DistributionIn["kind"]> & { hint: string }> = [
  { value: "cash_dividend", label: "Cash Dividend", hint: "A share of net income. Dividend tax is applied from each shareholder’s tax type." },
  { value: "return_of_capital", label: "Return of Capital", hint: "Gives back part of what was invested. Starts with no tax withheld; check with your accountant." },
  { value: "exit", label: "Exit / Liquidation Payout", hint: "Proceeds of a sale or wind-up. Starts with no tax withheld, and doesn’t apply preferred holders’ priority." },
];
export const distributionLabel = labelIn(DISTRIBUTION_KINDS);

/** Tax types and the dividend rate each starts with (Philippine defaults; every payout's rate can be changed). */
export const TAX_CLASSES: Array<Option<NonNullable<PayoutProfileIn["taxClass"]>>> = [
  { value: "", label: "Not set" },
  { value: "ph_individual", label: "PH citizen or resident (10%)" },
  { value: "nonresident_alien", label: "Non-resident alien, doing business in PH (20%)" },
  { value: "nonresident_alien_not_engaged", label: "Non-resident alien, not doing business in PH (25%)" },
  { value: "ph_corporation", label: "Domestic corporation (0%)" },
  { value: "foreign_corporation", label: "Non-resident foreign corporation (25%)" },
  { value: "custom", label: "Custom rate" },
];
export const taxClassLabel = labelIn(TAX_CLASSES);

export const PAYOUT_METHODS: Array<Option<NonNullable<PayoutProfileIn["method"]>>> = [
  { value: "", label: "Not set" },
  { value: "bank", label: "Bank transfer" },
  { value: "wise", label: "Wise" },
  { value: "gcash", label: "GCash" },
  { value: "check", label: "Check" },
];

/** 1250 → "12.5%". */
export const bpsPct = (bps: number) => `${bps / 100}%`;
