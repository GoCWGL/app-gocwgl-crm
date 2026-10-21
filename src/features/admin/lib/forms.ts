import { formUrl, iframeEmbed } from "@/features/public/links";

/** Snippet to paste into a landing page: the hosted form (/form/{id}) in an iframe that fits its content. */
export const embedCode = (formId: string, name = "Form") => iframeEmbed(formUrl(formId), name, 520);
