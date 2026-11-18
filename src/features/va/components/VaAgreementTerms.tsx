import { Icon, type IconName } from "@/components/ui";
import { formatCentsExact } from "@/utils/format/money";

/** What GoCWGL keeps per hour, and for how many months with each client (the API sends the same numbers). */
export const AGREEMENT_FEE_CENTS = 100;
export const AGREEMENT_MONTHS = 6;

/** A date-only value ("2027-05-18") as "May 18, 2027", without a time-zone shift. */
export function formatDay(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/**
 * The VA agreement: for the first months with each client GoCWGL keeps part of the VA's hourly rate while the team
 * makes sure the VA and client work well together. Between GoCWGL and the VA only; the client is never told.
 */
export function VaAgreementTerms({ feeCents = AGREEMENT_FEE_CENTS, months = AGREEMENT_MONTHS }: { feeCents?: number; months?: number }) {
  const fee = formatCentsExact(feeCents);
  const example = 600;
  const clauses: Array<{ icon: IconName; title: string; text: string }> = [
    {
      icon: "shield",
      title: "Monitoring period",
      text: `For your first ${months} months with each client, GoCWGL keeps ${fee} of your hourly rate. During that time our team checks in to make sure you and the client work well together.`,
    },
    {
      icon: "dollar",
      title: "Example",
      text: `If your rate is ${formatCentsExact(example)} an hour, you take home ${formatCentsExact(example - feeCents)} an hour for the first ${months} months with that client.`,
    },
    {
      icon: "trendUp",
      title: "Your full rate",
      text: `After ${months} months with no issues, you keep your full hourly rate (${formatCentsExact(example)} in the example) for that client.`,
    },
    {
      icon: "users",
      title: "Every client",
      text: `This applies to each new client you’re matched with. The ${months} months count from the day you’re matched.`,
    },
    {
      icon: "lock",
      title: "Confidential",
      text: "This is between you and GoCWGL. The client sees your full rate and isn’t told about this agreement. Please don’t discuss it with clients.",
    },
  ];

  return (
    <article className="agr-doc" aria-label="GoCWGL VA agreement">
      <header className="agr-doc__head">
        <span className="agr-doc__eyebrow">GoCWGL · Virtual Assistant Agreement</span>
        <h4 className="agr-doc__title">Pay during your first {months} months with a client</h4>
      </header>
      <dl className="agr-facts">
        <div className="agr-facts__item">
          <dt>GoCWGL keeps</dt>
          <dd>
            {fee}
            <small>/hr</small>
          </dd>
        </div>
        <div className="agr-facts__item">
          <dt>For</dt>
          <dd>
            {months}
            <small> months</small>
          </dd>
        </div>
        <div className="agr-facts__item">
          <dt>Then</dt>
          <dd>
            100%
            <small> of your rate</small>
          </dd>
        </div>
      </dl>
      <ol className="agr-clauses">
        {clauses.map((c, i) => (
          <li key={c.title} className="agr-clause">
            <span className="agr-clause__icon" aria-hidden="true">
              <Icon name={c.icon} size={14} />
            </span>
            <span className="agr-clause__body">
              <span className="agr-clause__title">
                <span className="agr-clause__num">{String(i + 1).padStart(2, "0")}</span>
                {c.title}
              </span>
              <span className="agr-clause__text">{c.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </article>
  );
}
