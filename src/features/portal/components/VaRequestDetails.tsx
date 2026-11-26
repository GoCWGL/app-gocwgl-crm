import { Icon, type IconName } from "@/components/ui";
import type { VaRequestOut } from "@/utils/api/models";
import { formatLong, formatShort } from "@/utils/format/dates";
import { formatCents, formatCentsExact } from "@/utils/format/money";
import { maintenanceFeeOf } from "../lib/vaAgreement";

export const ENGAGEMENT_LABEL: Record<VaRequestOut["engagement"], string> = { part_time: "Part-time", full_time: "Full-time", project: "Open project" };

/** "Mon–Fri, 9:00 AM – 5:00 PM · US Eastern (New York)", or an open project's "Open project · due Dec 15, 2026". */
export const requestHours = (r: Pick<VaRequestOut, "schedule" | "timezone" | "engagement" | "dueDate">) =>
  r.engagement === "project"
    ? ["Open project", r.dueDate && `due ${formatLong(r.dueDate)}`].filter(Boolean).join(" · ")
    : [r.schedule, r.timezone].filter(Boolean).join(" · ");

/** "40 hours a week" or "Open project". */
export const requestLoad = (r: Pick<VaRequestOut, "engagement" | "hoursPerWeek">) =>
  r.engagement !== "project" && r.hoursPerWeek ? `${r.hoursPerWeek} hours a week` : ENGAGEMENT_LABEL[r.engagement];

/** "Time tracker and Attendance", "Attendance only", "Not needed"… (what the client wants the VA to use). */
export function trackingLabel(r: Pick<VaRequestOut, "wantsTimeTracker" | "wantsAttendance">): string {
  const tracker = r.wantsTimeTracker !== false;
  const attendance = r.wantsAttendance !== false;
  if (tracker && attendance) return "Time tracker and Attendance";
  if (tracker) return "Time tracker only";
  if (attendance) return "Attendance only";
  return "Not needed";
}

/** The job posting text VAs read, built from the request (matches the server's default; no client name). */
export function jobDescriptionFrom(r: VaRequestOut): string {
  if (r.engagement === "project") {
    // The client's budget is for GoCWGL's quote, not shown to VAs.
    return [r.category && `Category\n${r.category}`, r.overview && `Project details\n${r.overview}`, r.dueDate && `Due date\n${formatLong(r.dueDate)}`, r.important && `Important\n${r.important}`]
      .filter(Boolean)
      .join("\n\n");
  }
  const hours = `${r.timezone ? `${r.schedule} (${r.timezone})` : r.schedule}${r.hoursPerWeek ? `, about ${r.hoursPerWeek} hours a week` : ""}`;
  const list = (title: string, xs: string[]) => (xs.length ? `${title}\n${xs.map((x) => `• ${x}`).join("\n")}` : "");
  return [
    r.category && `Category\n${r.category}`,
    r.overview && `Role overview\n${r.overview}`,
    `Working hours\n${hours}`,
    list("Key responsibilities", r.responsibilities),
    list("Must-have experience", r.mustHave),
    list("Good to have", r.niceToHave),
    r.important && `Important\n${r.important}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Every section of a VA request, as the client wrote it (admin and client views). Staff always see the monthly
 * maintenance fee (to invoice it); clients see it once they've accepted the VA agreement.
 */
export function VaRequestDetails({ r, staff, part }: { r: VaRequestOut; staff?: boolean; part?: "facts" | "body" }) {
  const fee = maintenanceFeeOf(r);
  const project = r.engagement === "project";
  return (
    <div className="rd">
      {part !== "body" && (
        <div className="rd-facts">
          {(r.category || staff) && <Fact icon="users" label="VA category" value={r.category || "Not chosen"} />}
          {r.startDate && <Fact icon="calendar" label="Start date" value={formatLong(r.startDate)} />}
          {project ? (
            <>
              <Fact icon="briefcase" label="Request" value="Open project" />
              <Fact icon="invoice" label="Estimated budget" value={r.budgetCents != null ? formatCents(r.budgetCents) : "—"} />
              <Fact icon="calendar" label="Due date" value={`${formatLong(r.dueDate)} · ends the day after`} />
              {r.requestedVa && <Fact icon="users" label="Asked for" value={`${r.requestedVa.name} (worked with ${staff ? "this client" : "you"} before)`} />}
              <Fact
                icon="invoice"
                label="Payment"
                value={
                  r.quoteAcceptedAt
                    ? `${formatCentsExact(r.quoteCents)} · ${staff ? "client" : "you"} agreed ${formatShort(r.quoteAcceptedAt)}`
                    : r.quoteCents != null
                      ? `${formatCentsExact(r.quoteCents)} quoted · waiting for ${staff ? "the client" : "you"} to agree`
                      : "No maintenance fee · GoCWGL will quote the price"
                }
              />
              {staff && <Fact icon="check" label="Project agreement" value={fee.acceptedAt ? `Accepted ${formatShort(fee.acceptedAt)}` : "Not accepted (added by GoCWGL)"} />}
            </>
          ) : (
            <>
              <Fact icon="clock" label="Working hours" value={r.schedule || "—"} />
              <Fact icon="globe" label="Time zone" value={r.timezone || "—"} />
              <Fact icon="briefcase" label="Commitment" value={requestLoad(r)} />
              <Fact icon="calendarCheck" label="Time tracking" value={trackingLabel(r)} />
              {(fee.agreed || staff) && (
                <Fact
                  icon="invoice"
                  label="Maintenance fee"
                  value={[fee.label, fee.hourlyLabel, fee.acceptedAt ? `agreed ${formatShort(fee.acceptedAt)}` : "standard rate, agreement not accepted"]
                    .filter(Boolean)
                    .join(" · ")}
                />
              )}
            </>
          )}
        </div>
      )}

      {part !== "facts" && (
        <>
          {r.overview && (
            <section className="rd-block">
              <h4 className="rd-block__title">
                <Icon name="textLong" size={14} /> {part === "body" ? "Description" : project ? "Project details" : "Role overview"}
              </h4>
              <p className="rd-block__text">{r.overview}</p>
            </section>
          )}

          {r.responsibilities.length > 0 && (
            <section className="rd-block">
              <h4 className="rd-block__title">
                <Icon name="clipboard" size={14} /> Key responsibilities
              </h4>
              <ul className="rd-list">
                {r.responsibilities.map((x, i) => (
                  <li key={i}>
                    <span className="rd-list__num">{i + 1}</span>
                    {x}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(r.mustHave.length > 0 || r.niceToHave.length > 0) && (
            <div className="rd-split">
              {r.mustHave.length > 0 && (
                <section className="rd-block rd-block--must">
                  <h4 className="rd-block__title">
                    <Icon name="circleCheck" size={14} /> Must-have experience
                  </h4>
                  <ul className="rd-checks">
                    {r.mustHave.map((x, i) => (
                      <li key={i}>
                        <Icon name="check" size={13} />
                        {x}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {r.niceToHave.length > 0 && (
                <section className="rd-block rd-block--nice">
                  <h4 className="rd-block__title">
                    <Icon name="sparkle" size={14} /> Good to have
                  </h4>
                  <ul className="rd-checks">
                    {r.niceToHave.map((x, i) => (
                      <li key={i}>
                        <Icon name="plus" size={13} />
                        {x}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          {r.important && (
            <section className="rd-important">
              <span className="rd-important__icon" aria-hidden="true">
                <Icon name="bolt" size={15} />
              </span>
              <span className="stack stack--2">
                <strong>Important</strong>
                <span>{r.important}</span>
              </span>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Fact({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="rd-fact">
      <span className="rd-fact__icon" aria-hidden="true">
        <Icon name={icon} size={15} />
      </span>
      <span className="stack stack--0">
        <span className="rd-fact__label">{label}</span>
        <span className="rd-fact__value">{value}</span>
      </span>
    </div>
  );
}
