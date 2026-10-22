"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import * as api from "@/utils/api/calendar";
import { errorMessage } from "@/utils/errors";
import { qk } from "@/utils/hooks/keys";

const MESSAGE = "gocwgl:calendar-connected";
const POPUP = "width=520,height=680,menubar=no,toolbar=no";

const APPS = {
  google: { name: "Google", what: "Google Calendar", mark: "G", start: api.startGoogleCalendar },
  zoom: { name: "Zoom", what: "Zoom", mark: "Z", start: api.startZoom },
};

/**
 * "Connect with Google" / "Connect Zoom": opens the app's consent screen in a popup. The API's callback page posts
 * the result back and closes itself; the app's pages can cut the link to this tab, so closing the popup also refreshes.
 */
export function ConnectButton({
  app,
  label,
  variant = "primary",
}: {
  app: keyof typeof APPS;
  label?: string;
  variant?: "primary" | "outline";
}) {
  const { name, what, mark, start } = APPS[app];
  const qc = useQueryClient();
  const popup = useRef<Window | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!waiting) return;
    const done = () => {
      setWaiting(false);
      void qc.invalidateQueries({ queryKey: qk.calendarConnections });
    };
    const onMessage = (e: MessageEvent) => {
      if (e.source !== popup.current || e.data?.type !== MESSAGE) return;
      if (!e.data.ok) setError(String(e.data.message || `${what} wasn’t connected.`));
      done();
    };
    const timer = window.setInterval(() => popup.current?.closed && done(), 800);
    window.addEventListener("message", onMessage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("message", onMessage);
    };
  }, [waiting, qc, what]);

  const connect = async () => {
    setError("");
    // Opened before the request so the browser treats it as a click, not a blocked popup.
    popup.current = window.open("", `gocwgl-connect-${app}`, POPUP);
    try {
      const { url } = await start();
      if (popup.current) {
        popup.current.location.href = url;
        setWaiting(true);
      } else {
        window.location.assign(url); // popups blocked: the callback page links back here
      }
    } catch (err) {
      popup.current?.close();
      setError(errorMessage(err));
    }
  };

  return (
    <div className="stack stack--6">
      <Button variant={variant} block disabled={waiting} onClick={connect}>
        <span className={`connect-mark connect-mark--${app}`} aria-hidden="true">
          {mark}
        </span>
        {waiting ? `Waiting for ${name}…` : (label ?? `Connect with ${name}`)}
      </Button>
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
