/**
 * Snippet a client pastes into their landing page to show a form. The widget script is hosted
 * separately; it loads the form from the public API (GET /public/forms/{id}) and posts submissions back.
 */
export const embedCode = (formId: string) => {
  const api = typeof window === "undefined" ? "/api" : `${window.location.origin}/api`;
  return `<div data-gocwgl-form="${formId || "save-the-form-first"}"></div>\n<script src="https://forms.[yourdomain].com/embed.js" data-api="${api}/public/forms/${formId || ""}" async></script>`;
};
