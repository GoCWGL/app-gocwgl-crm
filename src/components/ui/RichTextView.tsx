"use client";

import { useMemo, useSyncExternalStore } from "react";
import { lessonBodyHtml } from "@/lib/richText";
import { cn } from "@/lib/utils";

const noop = () => () => {};
const yes = () => true;
const no = () => false;

/**
 * Text written with the formatting editor (or older plain text), shown with its fonts, weights and sizes. It's cleaned
 * to the safe subset the editor writes first; that needs the browser, so the server render leaves it out.
 */
export function RichTextView({ body, className }: { body: string; className?: string }) {
  const client = useSyncExternalStore(noop, yes, no);
  const html = useMemo(() => (client && body ? lessonBodyHtml(body) : ""), [client, body]);
  if (!html) return null;
  return <div className={cn("rich-text", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
