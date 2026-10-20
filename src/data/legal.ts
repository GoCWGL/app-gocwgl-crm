// Shared facts for the Privacy, Terms and Status pages.

export const LEGAL_CONTACT = "support@gocwgl.com";

/** Bump this whenever the Privacy or Terms wording changes. */
export const LEGAL_UPDATED = "October 20, 2026";

export const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/status", label: "Status" },
] as const;
