"use client";

import { useState } from "react";
import { Button, Icon, TabBar, type SegmentOption } from "@/components/ui";
import { canWriteCrm } from "@/utils/auth/session";
import { useMe } from "@/utils/hooks/useUsers";
import { Availability } from "./Availability";
import { CalendarList } from "./CalendarList";
import { Integrations } from "./Integrations";
import { NewCalendarForm } from "./NewCalendarForm";
import { ScheduledCalls } from "./ScheduledCalls";

type CalendarView = "types" | "scheduled" | "availability" | "integrations";

const VIEWS: Array<SegmentOption<CalendarView>> = [
  { value: "types", label: "Calendars", hint: "Your booking pages", icon: "calendar" },
  { value: "scheduled", label: "Scheduled calls", hint: "What leads booked", icon: "calendarCheck", tone: "green" },
  { value: "availability", label: "Availability", hint: "When you take calls", icon: "clock", tone: "sky" },
  { value: "integrations", label: "Integrations", hint: "Connected apps", icon: "link", tone: "purple" },
];

export function CalendarSection() {
  const [view, setView] = useState<CalendarView>("types");
  const [creating, setCreating] = useState(false);
  const canWrite = canWriteCrm(useMe().data);

  return (
    <div className="page-stack">
      <TabBar
        stacked
        label="Calendar views"
        options={VIEWS}
        value={view}
        onChange={setView}
        actions={
          canWrite && (
            <Button
              variant="primary"
              onClick={() => {
                setCreating(true);
                setView("types");
              }}
            >
              <Icon name="plus" size={14} /> New calendar
            </Button>
          )
        }
      />

      {creating && <NewCalendarForm onClose={() => setCreating(false)} />}

      {view === "types" && <CalendarList />}
      {view === "scheduled" && <ScheduledCalls />}
      {view === "availability" && <Availability />}
      {view === "integrations" && <Integrations />}
    </div>
  );
}
