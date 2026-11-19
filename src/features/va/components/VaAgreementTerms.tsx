import { Icon, type IconName } from "@/components/ui";
import { formatCentsExact } from "@/utils/format/money";

/** The training fee per hour that comes off the VA's invoices, and for how many months with each client (the API sends the same numbers). */
export const AGREEMENT_FEE_CENTS = 100;
export const AGREEMENT_MONTHS = 6;

/** A date-only value ("2027-05-18") as "May 18, 2027", without a time-zone shift. */
export function formatDay(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/**
 * The VA agreement: for the first months with each client part of the VA's hourly rate goes to GoCWGL while the team
 * brings the VA up to date and makes sure the VA and client work well together. GoCWGL bills it to the client with
 * the maintenance fee (the client agreed to it), and the VA's invoices take it off automatically.
 */
export function VaAgreementTerms({ feeCents = AGREEMENT_FEE_CENTS, months = AGREEMENT_MONTHS }: { feeCents?: number; months?: number }) {
  const fee = formatCentsExact(feeCents);
  const example = 600;
  const hours = 100;
  const clauses: Array<{ icon: IconName; title: string; text: string }> = [
    {
      icon: "shield",
      title: "Training period",
      text: `For your first ${months} months with each client, ${fee} of your hourly rate goes to GoCWGL. During that time our team brings you up to date on the client’s work and checks in to make sure you and the client work well together.`,
    },
    {
      icon: "invoice",
      title: "Billed through the maintenance fee",
      text: `GoCWGL bills that ${fee} an hour to the client with its monthly maintenance fee, so the client doesn’t pay twice. The client agreed to this when they requested a VA.`,
    },
    {
      icon: "dollar",
      title: "Taken off your invoice automatically",
      text: `Your invoice to the client adds up your hours at your full rate, then takes off ${fee} for each hour. For example, ${hours} hours at ${formatCentsExact(example)} an hour is ${formatCentsExact(example * hours)}, less ${formatCentsExact(feeCents * hours)}, so you’re paid ${formatCentsExact((example - feeCents) * hours)}.`,
    },
    {
      icon: "trendUp",
      title: "Your full rate",
      text: `After ${months} months with no issues, nothing comes off: your invoices are at your full hourly rate (${formatCentsExact(example)} in the example) for that client.`,
    },
    {
      icon: "users",
      title: "Every client",
      text: `This applies to each new client you’re matched with. The ${months} months count from the day you’re matched.`,
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
          <dt>Training fee</dt>
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
