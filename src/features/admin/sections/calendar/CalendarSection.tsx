"use client";

import { useState } from "react";
import { Button, SegmentedControl } from "@/components/ui";
import { canWriteCrm } from "@/utils/auth/session";
import { useMe } from "@/utils/hooks/useUsers";
import { Availability } from "./Availability";
import { CalendarList } from "./CalendarList";
import { CalendarSync } from "./CalendarSync";
import { NewCalendarForm } from "./NewCalendarForm";
import { ScheduledCalls } from "./ScheduledCalls";

type CalendarView = "types" | "scheduled" | "availability" | "sync";

const VIEWS: Array<{ value: CalendarView; label: string }> = [
  { value: "types", label: "Calendars" },
  { value: "scheduled", label: "Scheduled calls" },
  { value: "availability", label: "Availability" },
  { value: "sync", label: "Calendar sync" },
];

export function CalendarSection() {
  const [view, setView] = useState<CalendarView>("types");
  const [creating, setCreating] = useState(false);
  const canWrite = canWriteCrm(useMe().data);

  return (
    <div className="page-stack">
      <div className="section-head">
        <SegmentedControl kind="tabs" label="Calendar views" options={VIEWS} value={view} onChange={setView} />
        {canWrite && (
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              setCreating(true);
              setView("types");
            }}
          >
            + New calendar
          </Button>
        )}
      </div>

      {creating && <NewCalendarForm onClose={() => setCreating(false)} />}

      {view === "types" && <CalendarList />}
      {view === "scheduled" && <ScheduledCalls />}
      {view === "availability" && <Availability />}
      {view === "sync" && <CalendarSync />}
    </div>
  );
}
