import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

export function renderMarkdownSafe(mdText) {
  const raw = marked.parse(mdText ?? "", { mangle: false, headerIds: false });
  // sanitize to prevent XSS
  return sanitizeHtml(raw, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title"],
      code: ["class"]
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" })
    }
  });
}
