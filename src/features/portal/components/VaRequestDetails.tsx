import { Icon, type IconName } from "@/components/ui";
import type { VaRequestOut } from "@/utils/api/models";

export const ENGAGEMENT_LABEL: Record<VaRequestOut["engagement"], string> = { part_time: "Part-time", full_time: "Full-time", project: "Open project" };

/** "Mon–Fri, 9:00 AM – 5:00 PM · US Eastern (New York)". */
export const requestHours = (r: Pick<VaRequestOut, "schedule" | "timezone">) => [r.schedule, r.timezone].filter(Boolean).join(" · ");

/** "40 hours a week" or "Open project". */
export const requestLoad = (r: Pick<VaRequestOut, "engagement" | "hoursPerWeek">) =>
  r.engagement !== "project" && r.hoursPerWeek ? `${r.hoursPerWeek} hours a week` : ENGAGEMENT_LABEL[r.engagement];

/** The job posting text VAs read, built from the request (matches the server's default; no client name). */
export function jobDescriptionFrom(r: VaRequestOut): string {
  const hours = `${r.timezone ? `${r.schedule} (${r.timezone})` : r.schedule}${r.hoursPerWeek ? `, about ${r.hoursPerWeek} hours a week` : ""}`;
  const list = (title: string, xs: string[]) => (xs.length ? `${title}\n${xs.map((x) => `• ${x}`).join("\n")}` : "");
  return [
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

/** Every section of a VA request, as the client wrote it (admin and client views). */
export function VaRequestDetails({ r }: { r: VaRequestOut }) {
  return (
    <div className="rd">
      <div className="rd-facts">
        <Fact icon="clock" label="Working hours" value={r.schedule || "—"} />
        <Fact icon="globe" label="Time zone" value={r.timezone || "—"} />
        <Fact icon="briefcase" label="Commitment" value={requestLoad(r)} />
      </div>

      {r.overview && (
        <section className="rd-block">
          <h4 className="rd-block__title">
            <Icon name="textLong" size={14} /> Role overview
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
