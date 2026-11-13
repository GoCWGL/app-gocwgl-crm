"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Tabs, type TabsProps } from "./Tabs";

/**
 * Page tabs in a card bar: each tab with its icon, label, a short line under it and a count, and the page's
 * actions on the right ("New build"). The same look as the boards (Job Postings, Clients…), for every page.
 */
export function TabBar<T extends string>({
  actions,
  stacked = false,
  className,
  ...tabs
}: TabsProps<T> & { actions?: ReactNode; /** Many tabs or a narrow spot: the actions get their own row above the tabs. */ stacked?: boolean }) {
  return (
    <div className={cn("card card--flat board board--bar-only", className)}>
      <div className={cn("board__bar", stacked && "board__bar--stacked")}>
        <Tabs {...tabs} />
        {actions && <div className="board__actions">{actions}</div>}
      </div>
    </div>
  );
}
