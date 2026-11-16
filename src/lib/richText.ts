/**
 * Reading lessons' formatted text. It's stored as a small, safe subset of HTML (paragraphs, lists, bold/italic/underline
 * and spans with a font, weight or size). Older lessons hold plain text (a blank line between paragraphs); both show.
 */

export const FONT_FAMILIES = [
  { value: "", label: "Default font" },
  { value: "sans", label: "Sans serif", css: `var(--font-sans), "Manrope", system-ui, sans-serif` },
  { value: "serif", label: "Serif", css: `Georgia, "Times New Roman", serif` },
  { value: "mono", label: "Monospace", css: `var(--font-mono), "JetBrains Mono", ui-monospace, monospace` },
] as const;

export const FONT_WEIGHTS = [
  { value: "", label: "Weight" },
  { value: "300", label: "Light" },
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra bold" },
] as const;

export const FONT_SIZES = [
  { value: "", label: "Size" },
  { value: "12px", label: "12" },
  { value: "14px", label: "14" },
  { value: "15px", label: "15 (normal)" },
  { value: "18px", label: "18" },
  { value: "20px", label: "20" },
  { value: "24px", label: "24" },
  { value: "30px", label: "30" },
  { value: "36px", label: "36" },
] as const;

const TAGS = new Set(["P", "DIV", "BR", "SPAN", "B", "STRONG", "I", "EM", "U", "S", "UL", "OL", "LI", "H2", "H3", "BLOCKQUOTE"]);
/** Dropped along with everything inside them. */
const DROP = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "TEMPLATE", "NOSCRIPT", "SVG", "MATH", "HEAD", "TITLE", "META", "LINK"]);

/** Which family a stored `font-family` value is (matched loosely, so pasted text keeps a sensible font). */
export function familyKey(css: string): string {
  const v = css.toLowerCase();
  if (/mono|courier|consol/.test(v)) return "mono";
  if (/serif/.test(v) && !/sans-serif/.test(v)) return "serif";
  if (/georgia|times|garamond|cambria/.test(v)) return "serif";
  return v ? "sans" : "";
}

/** The CSS for one of the families. */
export const familyCss = (key: string): string | undefined => {
  const f = FONT_FAMILIES.find((x) => x.value === key);
  return f && "css" in f ? f.css : undefined;
};

function cleanStyle(el: HTMLElement): string {
  const s = el.style;
  const out: string[] = [];
  const family = familyCss(familyKey(s.fontFamily));
  if (s.fontFamily && family) out.push(`font-family: ${family}`);
  const w = s.fontWeight === "bold" ? "700" : s.fontWeight === "normal" ? "400" : s.fontWeight;
  if (/^[1-9]00$/.test(w)) out.push(`font-weight: ${w}`);
  const size = /^(\d{1,2}(?:\.\d+)?)px$/.exec(s.fontSize);
  if (size && +size[1] >= 10 && +size[1] <= 48) out.push(`font-size: ${size[1]}px`);
  if (s.fontStyle === "italic") out.push("font-style: italic");
  if (/underline/.test(s.textDecoration || s.textDecorationLine)) out.push("text-decoration: underline");
  if (/^(left|center|right)$/.test(s.textAlign)) out.push(`text-align: ${s.textAlign}`);
  return out.join("; ");
}

function cleanChildren(from: Node, to: Node, doc: Document) {
  from.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) {
      to.appendChild(doc.createTextNode(n.textContent ?? ""));
      return;
    }
    if (n.nodeType !== Node.ELEMENT_NODE) return;
    const el = n as HTMLElement;
    if (DROP.has(el.tagName)) return;
    if (!TAGS.has(el.tagName)) {
      cleanChildren(el, to, doc); // keep the text, lose the tag
      return;
    }
    const copy = doc.createElement(el.tagName.toLowerCase());
    const style = cleanStyle(el);
    if (style) copy.setAttribute("style", style);
    cleanChildren(el, copy, doc);
    to.appendChild(copy);
  });
}

/** Only the allowed tags and styles survive (no attributes, links, scripts or event handlers). Browser only. */
export function sanitizeHtml(html: string): string {
  if (typeof DOMParser === "undefined") return escapeHtml(toPlainText(html));
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const out = doc.createElement("div");
  cleanChildren(doc.body, out, doc);
  return out.innerHTML;
}

/** True when the lesson's text was written with the formatting editor (otherwise it's older plain text). */
export const isRichText = (body: string) => /^\s*<(p|div|span|ul|ol|h2|h3|blockquote|b|strong|i|em|u|br)\b/i.test(body);

export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Plain text (a blank line between paragraphs) as the editor's HTML. */
export const plainToHtml = (text: string) =>
  text
    .split(/\n\s*\n/)
    .filter((p) => p.trim())
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

/** A lesson body (formatted or plain) as safe HTML to show. */
export const lessonBodyHtml = (body: string) => (isRichText(body) ? sanitizeHtml(body) : plainToHtml(body));

/** Just the words, e.g. to tell whether anything was written. */
export function toPlainText(body: string): string {
  if (!isRichText(body)) return body;
  return body
    .replace(/<(br|\/p|\/div|\/li|\/h[23])\b[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

const same = (a: string, b: string) => a.replace(/\s+/g, " ").trim().toLowerCase() === b.replace(/\s+/g, " ").trim().toLowerCase();

/** The body without a first line that only repeats the lesson's title (the page already shows it as the heading). */
export function withoutLeadingTitle(body: string, title: string): string {
  if (!title.trim()) return body;
  if (isRichText(body)) {
    const m = /^\s*<(p|h2|h3|div)\b[^>]*>([\s\S]*?)<\/\1>/i.exec(body);
    return m && same(toPlainText(`<p>${m[2]}</p>`), title) ? body.slice(m[0].length) : body;
  }
  const [first, ...rest] = body.split("\n");
  return same(first, title) ? rest.join("\n").replace(/^\s*\n/, "") : body;
}
