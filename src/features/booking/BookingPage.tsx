"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { ErrorState, Loading } from "@/components/ui";
import type { PublicBookingOut } from "@/utils/api/models";
import { hasCode } from "@/utils/errors";
import { usePublicCalendar } from "@/utils/hooks/useCalendar";
import { useIsEmbedded } from "../public/embed";
import { PublicMessage, PublicShell } from "../public/PublicShell";
import { BookingConfirmed } from "./BookingConfirmed";
import { BookingDetailsForm } from "./BookingDetailsForm";
import { BookingWidget } from "./BookingWidget";
import { browserZone } from "./zones";

type Picked = { slot: string; zone: string };

/** Public booking page at /book/{slug}: pick a time, leave your details, get a confirmation email. */
export function BookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const embedded = useIsEmbedded();
  const page = usePublicCalendar(slug);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [booked, setBooked] = useState<(Picked & { email: string; booking: PublicBookingOut }) | null>(null);
  const [slotTaken, setSlotTaken] = useState(false);
  // The zone the visitor views times in; kept here so it survives going back from the details form.
  const [viewZone, setViewZone] = useState(() => browserZone());

  let body;
  if (page.isPending) body = <Loading text="Loading calendar…" />;
  else if (page.isError)
    body = hasCode(page.error, "not_found") ? (
      <PublicMessage title="This booking link isn’t available">
        <p className="text-muted">The calendar may have been turned off or renamed. Ask for a new link.</p>
      </PublicMessage>
    ) : (
      <ErrorState error={page.error} onRetry={page.refetch} />
    );
  else if (booked) body = <BookingConfirmed booking={booked.booking} email={booked.email} timeZone={booked.zone} />;
  else if (picked)
    body = (
      <BookingDetailsForm
        slug={slug}
        info={page.data}
        picked={picked}
        onBack={() => setPicked(null)}
        onBooked={(email, booking) => setBooked({ ...picked, email, booking })}
        onTaken={() => {
          setSlotTaken(true);
          setPicked(null);
        }}
      />
    );
  else
    body = (
      <BookingWidget
        slug={slug}
        info={page.data}
        active
        viewZone={viewZone}
        onViewZoneChange={setViewZone}
        notice={
          slotTaken && (
            <p className="text-error" role="alert">
              Sorry, that time was just taken. Please pick another one.
            </p>
          )
        }
        onConfirm={(slot, zone) => {
          setSlotTaken(false);
          setPicked({ slot, zone });
        }}
        onChange={() => setSlotTaken(false)}
      />
    );

  return (
    <PublicShell embedded={embedded} wide>
      {booked || picked ? body : <section className="booking-preview">{body}</section>}
    </PublicShell>
  );
}
