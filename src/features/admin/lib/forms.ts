import { slugify } from "@/lib/utils";

/** Script tag a client pastes into their landing page to show a form. */
export const embedCode = (name: string) =>
  `<script src="https://forms.[yourdomain].com/embed.js" data-form="${slugify(name || "form")}"></script>`;
