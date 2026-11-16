"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { FONT_FAMILIES, FONT_SIZES, FONT_WEIGHTS, familyCss, familyKey, lessonBodyHtml, sanitizeHtml, toPlainText } from "@/lib/richText";
import { Icon } from "./Icon";

type StyleProp = "fontFamily" | "fontWeight" | "fontSize";
const CSS_NAME: Record<StyleProp, string> = { fontFamily: "font-family", fontWeight: "font-weight", fontSize: "font-size" };
const BLOCKS = new Set(["P", "DIV", "LI", "H2", "H3", "UL", "OL", "BLOCKQUOTE"]);
const INLINE_FORMAT = new Set(["SPAN", "B", "STRONG", "I", "EM", "U", "S", "FONT"]);

/** Remove one style (or every style and inline format, for "clear") from a node and what's inside it. */
function strip(node: Node, prop: StyleProp | "all") {
  if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
  Array.from(node.childNodes).forEach((c) => strip(c, prop));
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  if (prop === "all") el.removeAttribute("style");
  else {
    el.style.removeProperty(CSS_NAME[prop]);
    if (prop === "fontWeight" && (el.tagName === "B" || el.tagName === "STRONG")) return unwrap(el);
    if (!el.getAttribute("style")) el.removeAttribute("style");
  }
  if (el.tagName === "SPAN" && !el.hasAttribute("style")) unwrap(el);
  else if (prop === "all" && INLINE_FORMAT.has(el.tagName)) unwrap(el);
}

function unwrap(el: HTMLElement) {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

/**
 * A small editor for reading lessons: font (sans, serif or monospace), weight and size for the selected text — or the
 * whole paragraph when nothing is selected — plus bold, italic, underline and lists. `value` is safe HTML
 * (see `lib/richText`); older plain text is shown as paragraphs and saved as HTML once edited.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  invalid,
  maxLength,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  invalid?: boolean;
  maxLength?: number;
  "aria-label"?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const emitted = useRef<string | null>(null);
  const saved = useRef<Range | null>(null);
  const [current, setCurrent] = useState({ family: "", weight: "", size: "" });
  const [empty, setEmpty] = useState(!toPlainText(value).trim());

  // Load the value into the editor (on open, or when it changes from outside, e.g. the lesson was switched).
  useEffect(() => {
    const el = ref.current;
    if (!el || value === emitted.current) return;
    el.innerHTML = value ? lessonBodyHtml(value) : "";
    emitted.current = value;
    setEmpty(!toPlainText(value).trim());
  }, [value]);

  // Remember where the cursor was (the toolbar's dropdowns take focus) and show its font, weight and size.
  useEffect(() => {
    const onSelect = () => {
      const sel = window.getSelection();
      const el = ref.current;
      if (!sel?.rangeCount || !el || !el.contains(sel.anchorNode)) return;
      saved.current = sel.getRangeAt(0).cloneRange();
      const at = sel.anchorNode?.nodeType === Node.TEXT_NODE ? sel.anchorNode.parentElement : (sel.anchorNode as HTMLElement | null);
      if (!at) return;
      const cs = getComputedStyle(at);
      const size = `${Math.round(parseFloat(cs.fontSize))}px`;
      const own = (p: StyleProp) => {
        for (let n: HTMLElement | null = at; n && n !== el; n = n.parentElement) if (n.style[p]) return true;
        return false;
      };
      setCurrent({
        family: own("fontFamily") ? familyKey(cs.fontFamily) : "",
        weight: String(Math.round(+cs.fontWeight / 100) * 100),
        size: FONT_SIZES.some((s) => s.value === size) ? size : "",
      });
    };
    document.addEventListener("selectionchange", onSelect);
    return () => document.removeEventListener("selectionchange", onSelect);
  }, []);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    const text = (el.textContent ?? "").trim();
    const html = text ? sanitizeHtml(el.innerHTML) : "";
    emitted.current = html;
    setEmpty(!text);
    onChange(html);
  };

  /** Put the cursor back where it was before a toolbar control took focus. */
  const restore = (): Range | null => {
    const el = ref.current;
    const sel = window.getSelection();
    if (!el || !sel) return null;
    el.focus();
    const r = saved.current;
    if (r && el.contains(r.commonAncestorContainer)) {
      sel.removeAllRanges();
      sel.addRange(r);
      return r;
    }
    return sel.rangeCount && el.contains(sel.getRangeAt(0).commonAncestorContainer) ? sel.getRangeAt(0) : null;
  };

  const blockOf = (node: Node | null): HTMLElement | null => {
    const el = ref.current;
    for (let n = node; n && n !== el; n = n.parentNode) if (n.nodeType === Node.ELEMENT_NODE && BLOCKS.has((n as HTMLElement).tagName)) return n as HTMLElement;
    return null;
  };

  const applyStyle = (prop: StyleProp | "all", css: string) => {
    const el = ref.current;
    const range = restore();
    if (!el || !range) return;
    /** Give an element the style (its own and its contents' old value of it removed first). */
    const set = (target: HTMLElement) => {
      Array.from(target.childNodes).forEach((c) => strip(c, prop));
      if (prop === "all") target.removeAttribute("style");
      else {
        target.style.removeProperty(CSS_NAME[prop]);
        if (css) target.style.setProperty(CSS_NAME[prop], css);
        if (!target.getAttribute("style")) target.removeAttribute("style");
      }
    };
    if (range.collapsed) {
      // Nothing selected: the whole paragraph (wrapping loose text in one first).
      let block = blockOf(range.startContainer);
      if (!block) {
        document.execCommand("formatBlock", false, "p");
        block = blockOf(window.getSelection()?.anchorNode ?? null);
      }
      if (block) set(block);
    } else {
      const frag = range.extractContents();
      // Blocks (paragraphs, list items) and spans take the style themselves, so re-styling the same text doesn't pile up
      // spans; loose text and other inline bits are wrapped in a new span.
      const pieces: HTMLElement[] = [];
      let inline: HTMLSpanElement | null = null;
      Array.from(frag.childNodes).forEach((n) => {
        const tag = n.nodeType === Node.ELEMENT_NODE ? (n as HTMLElement).tagName : "";
        if (BLOCKS.has(tag) || tag === "SPAN") {
          pieces.push(n as HTMLElement);
          inline = null;
        } else {
          if (!inline) {
            inline = document.createElement("span");
            pieces.push(inline);
          }
          inline.appendChild(n);
        }
      });
      const out = document.createDocumentFragment();
      pieces.forEach((p) => {
        set(p);
        if (p.tagName === "SPAN" && !p.hasAttribute("style")) while (p.firstChild) out.appendChild(p.firstChild);
        else out.appendChild(p);
      });
      const first = out.firstChild;
      const last = out.lastChild;
      range.insertNode(out);
      if (first && last) {
        const sel = window.getSelection();
        const r = document.createRange();
        r.setStartBefore(first);
        r.setEndAfter(last);
        sel?.removeAllRanges();
        sel?.addRange(r);
        saved.current = r.cloneRange();
      }
      // Empty leftovers where the selection was cut out.
      el.querySelectorAll("span, p, li").forEach((n) => !n.textContent && !n.querySelector("br") && n.remove());
    }
    emit();
  };

  const command = (name: string) => {
    restore();
    document.execCommand(name, false);
    emit();
  };

  const tooLong = maxLength !== undefined && value.length > maxLength;

  return (
    <div className={cn("rte", invalid && "is-invalid")}>
      <div className="rte__toolbar" role="toolbar" aria-label="Text formatting">
        <select
          className="select select--sm rte__select"
          aria-label="Font"
          value={current.family}
          onChange={(e) => applyStyle("fontFamily", familyCss(e.target.value) ?? "")}
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select className="select select--sm rte__select" aria-label="Font weight" value={current.weight} onChange={(e) => applyStyle("fontWeight", e.target.value)}>
          {FONT_WEIGHTS.map((w) => (
            <option key={w.value} value={w.value} disabled={!w.value}>
              {w.label}
            </option>
          ))}
        </select>
        <select className="select select--sm rte__select" aria-label="Font size" value={current.size} onChange={(e) => applyStyle("fontSize", e.target.value)}>
          {FONT_SIZES.map((s) => (
            <option key={s.value} value={s.value} disabled={!s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <span className="rte__sep" />
        {(
          [
            ["bold", "B", "Bold"],
            ["italic", "I", "Italic"],
            ["underline", "U", "Underline"],
          ] as const
        ).map(([cmd, label, title]) => (
          <button key={cmd} type="button" className={cn("rte__btn", `rte__btn--${cmd}`)} title={title} aria-label={title} onMouseDown={(e) => e.preventDefault()} onClick={() => command(cmd)}>
            {label}
          </button>
        ))}
        <span className="rte__sep" />
        <button type="button" className="rte__btn" title="Bulleted list" aria-label="Bulleted list" onMouseDown={(e) => e.preventDefault()} onClick={() => command("insertUnorderedList")}>
          •
        </button>
        <button type="button" className="rte__btn" title="Numbered list" aria-label="Numbered list" onMouseDown={(e) => e.preventDefault()} onClick={() => command("insertOrderedList")}>
          1.
        </button>
        <span className="u-spacer" />
        <button type="button" className="rte__btn rte__btn--text" title="Clear formatting" onMouseDown={(e) => e.preventDefault()} onClick={() => applyStyle("all", "")}>
          <Icon name="close" size={11} /> Clear
        </button>
      </div>
      <div
        ref={ref}
        className={cn("rte__area lesson-reading__body", empty && "is-empty")}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        aria-invalid={invalid || tooLong}
        data-placeholder={placeholder}
        onFocus={() => {
          document.execCommand("defaultParagraphSeparator", false, "p");
          // Start an empty editor with a paragraph, so the first line is one too.
          const el = ref.current;
          if (el && !el.textContent?.trim() && !el.querySelector("p, ul, ol")) {
            el.innerHTML = "<p><br></p>";
            const r = document.createRange();
            r.setStart(el.firstChild!, 0);
            r.collapse(true);
            window.getSelection()?.removeAllRanges();
            window.getSelection()?.addRange(r);
          }
        }}
        onInput={emit}
        onPaste={(e) => {
          e.preventDefault();
          const html = e.clipboardData.getData("text/html");
          const text = e.clipboardData.getData("text/plain");
          if (html) document.execCommand("insertHTML", false, sanitizeHtml(html));
          else document.execCommand("insertText", false, text);
          emit();
        }}
      />
      {tooLong && <span className="text-tiny text-error">This reading is too long. Shorten it or put it in a document.</span>}
    </div>
  );
}
