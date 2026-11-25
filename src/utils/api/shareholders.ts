import { opensInline } from "@/data/shareholders";
import { api, del, download, get, post, put } from "./client";
import type {
  BudgetLineIn,
  CashBalanceIn,
  DataRoomDocumentOut,
  DistributionDetailOut,
  DistributionIn,
  DistributionPreviewOut,
  DistributionsOut,
  DocumentPatch,
  EquityGrantIn,
  EquitySettingsIn,
  FundingRoundIn,
  InteractionIn,
  InteractionOut,
  InvestorUpdateIn,
  InvestorUpdateOut,
  MilestoneIn,
  MyPayoutOut,
  MyShareholdingOut,
  PayoutProfileIn,
  PayoutProfileOut,
  RevealedProfileOut,
  SharedDocumentOut,
  ShareholderOverviewOut,
  StakeholderIn,
} from "./models";

const BASE = "/admin/shareholders";

// ------------------------------------------------------------------ Super admins
export const getShareholders = (year?: number) => get<ShareholderOverviewOut>(BASE, { year });

/** The records each page adds, edits and deletes. */
export type RecordBodies = {
  stakeholders: StakeholderIn;
  rounds: FundingRoundIn;
  grants: EquityGrantIn;
  cash: CashBalanceIn;
  milestones: MilestoneIn;
  updates: InvestorUpdateIn;
};
export type RecordKind = keyof RecordBodies;
/** Without an id it's added; with one it's replaced. */
export const saveRecord = <K extends RecordKind>(kind: K, id: string | undefined, body: RecordBodies[K]) =>
  id ? put<{ id: string }>(`${BASE}/${kind}/${id}`, body) : post<{ id: string }>(`${BASE}/${kind}`, body);
export const deleteRecord = (kind: RecordKind | "interactions" | "distributions" | "documents", id: string) => del(`${BASE}/${kind}/${id}`);

export const listInteractions = (stakeholderId: string) => get<InteractionOut[]>(`${BASE}/stakeholders/${stakeholderId}/interactions`);
export const addInteraction = (stakeholderId: string, body: InteractionIn) =>
  post<InteractionOut>(`${BASE}/stakeholders/${stakeholderId}/interactions`, body);

export const saveEquitySettings = (body: EquitySettingsIn) => put<unknown>(`${BASE}/settings`, body);
/** Replaces the whole year's budget. */
export const saveBudget = (v: { year: number; lines: BudgetLineIn[] }) => put<void>(`${BASE}/budget/${v.year}`, { lines: v.lines });

// Tax and payout details: masked, except reveal (which is on the audit log).
export const getPayoutProfile = (id: string) => get<PayoutProfileOut>(`${BASE}/stakeholders/${id}/payout-profile`);
export const savePayoutProfile = (v: { id: string; body: PayoutProfileIn }) => put<PayoutProfileOut>(`${BASE}/stakeholders/${v.id}/payout-profile`, v.body);
export const revealPayoutProfile = (id: string) => post<RevealedProfileOut>(`${BASE}/stakeholders/${id}/payout-profile/reveal`);

// Distributions. They keep the records; no money is sent.
export const listDistributions = () => get<DistributionsOut>(`${BASE}/distributions`);
export const getDistribution = (id: string) => get<DistributionDetailOut>(`${BASE}/distributions/${id}`);
/** Saves nothing. */
export const previewDistribution = (body: DistributionIn) => post<DistributionPreviewOut>(`${BASE}/distributions/preview`, body);
export const saveDistribution = (v: { id?: string; body: DistributionIn }) =>
  v.id ? put<DistributionDetailOut>(`${BASE}/distributions/${v.id}`, v.body) : post<DistributionDetailOut>(`${BASE}/distributions`, v.body);
export const declareDistribution = (v: { id: string; fingerprint: string; notify: boolean }) =>
  post<DistributionDetailOut>(`${BASE}/distributions/${v.id}/declare`, { fingerprint: v.fingerprint, notify: v.notify });
export const cancelDistribution = (v: { id: string; reason: string }) => post<DistributionDetailOut>(`${BASE}/distributions/${v.id}/cancel`, { reason: v.reason });
export const setResolution = (v: { id: string; file: File }) => {
  const body = new FormData();
  body.append("file", v.file);
  return api<DistributionDetailOut>(`${BASE}/distributions/${v.id}/resolution`, { method: "PUT", body, signal: AbortSignal.timeout(120_000) });
};
export const openResolution = (id: string) => download(`${BASE}/distributions/${id}/resolution`);
export const setPayoutTax = (v: { id: string; taxBps: number }) => put<DistributionDetailOut>(`${BASE}/payouts/${v.id}/tax`, { taxBps: v.taxBps });
export const markPayoutPaid = (v: { id: string; paidOn: string; reference: string; notify: boolean; receipt: File | null }) => {
  const form = new FormData();
  form.append("paidOn", v.paidOn);
  form.append("reference", v.reference);
  form.append("notify", String(v.notify));
  if (v.receipt) form.append("file", v.receipt);
  return post<DistributionDetailOut>(`${BASE}/payouts/${v.id}/paid`, form);
};
export const undoPayoutPaid = (id: string) => del<DistributionDetailOut>(`${BASE}/payouts/${id}/paid`);
export const downloadVoucher = (v: { id: string; name: string }) => download(`${BASE}/payouts/${v.id}/voucher`, `Voucher - ${v.name}.pdf`);
export const openReceipt = (id: string) => download(`${BASE}/payouts/${id}/receipt`);

export const listInvestorUpdates = () => get<InvestorUpdateOut[]>(`${BASE}/updates`);
export const publishUpdate = (v: { id: string; withNumbers: boolean }) =>
  post<InvestorUpdateOut>(`${BASE}/updates/${v.id}/publish`, { withNumbers: v.withNumbers });
export const unpublishUpdate = (id: string) => del<InvestorUpdateOut>(`${BASE}/updates/${id}/publish`);

export const listDocuments = () => get<DataRoomDocumentOut[]>(`${BASE}/documents`);
export const uploadDocument = (v: { file: File; meta: DocumentPatch }) => {
  const form = new FormData();
  form.append("file", v.file);
  form.append("title", v.meta.title);
  form.append("category", v.meta.category);
  form.append("visibility", v.meta.visibility);
  if (v.meta.documentDate) form.append("documentDate", v.meta.documentDate);
  v.meta.stakeholderIds?.forEach((id) => form.append("stakeholderIds", id));
  return post<DataRoomDocumentOut>(`${BASE}/documents`, form);
};
export const updateDocument = (v: { id: string; meta: DocumentPatch }) => put<DataRoomDocumentOut>(`${BASE}/documents/${v.id}`, v.meta);
export const openDocument = (d: SharedDocumentOut) => download(`${BASE}/documents/${d.id}/file`, opensInline(d) ? undefined : d.fileName);

// ------------------------------------------------------------------ The signed-in shareholder
export const getMyShareholding = (year?: number) => get<MyShareholdingOut>("/shareholder/dashboard", { year });
export const myInvestorUpdates = () => get<InvestorUpdateOut[]>("/shareholder/updates");
export const myDocuments = () => get<SharedDocumentOut[]>("/shareholder/documents");
export const openMyDocument = (d: SharedDocumentOut) => download(`/shareholder/documents/${d.id}/file`, opensInline(d) ? undefined : d.fileName);
export const myDistributions = () => get<MyPayoutOut[]>("/shareholder/distributions");
export const downloadMyVoucher = (v: { id: string; title: string }) => download(`/shareholder/payouts/${v.id}/voucher`, `Voucher - ${v.title}.pdf`);
export const openMyReceipt = (id: string) => download(`/shareholder/payouts/${id}/receipt`);
