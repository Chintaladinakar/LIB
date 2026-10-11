// Accessibility checks for what creators type. The page itself already passes automated checks;
// these catch problems only the content can cause, like a screen reader announcing
// "click here, link" six times. Pure function, run live in the editor.
import type { ProfileDraft } from "./draft";
import { MAP_SEARCH } from "./embeds";

export type A11yWarning = {
  // id of the field to focus: "displayName", "link-title-<id>", ...
  field: string;
  message: string;
};

const VAGUE = new Set([
  "click here", "here", "link", "links", "more", "read more", "learn more", "this", "go",
  "tap here", "click", "check it out", "my link", "open", "website", "url",
]);

export function lintDraft(draft: ProfileDraft): A11yWarning[] {
  const warnings: A11yWarning[] = [];

  if (!draft.displayName.trim()) {
    warnings.push({
      field: "displayName",
      message: "Add your name. It becomes the page's main heading, which screen readers announce first.",
    });
  }

  const byTitle = new Map<string, Set<string>>();
  draft.links.forEach((link, index) => {
    const n = index + 1;
    const title = link.title.trim();
    const field = `link-title-${link.id}`;

    if (!title) {
      // A tile with nothing in it is dropped on save; anything else needs a title to save. A new
      // map tile's bare search address doesn't count as content.
      const url = link.url.trim();
      if ((url && url !== MAP_SEARCH) || link.description.trim() || link.imageKey) {
        warnings.push({ field, message: `Link ${n} has no title. Add one so visitors know where it goes.` });
      }
      return;
    }
    if (VAGUE.has(title.toLowerCase().replace(/[.!…]+$/, ""))) {
      warnings.push({
        field,
        message: `"${title}" doesn't say where it goes. Screen reader users often hear a list of link titles with no context, so name the destination ("Latest video", "Shop my prints").`,
      });
    }
    if (/^(https?:\/\/|www\.)/i.test(title)) {
      warnings.push({
        field,
        message: `Link ${n}'s title is a web address. Screen readers read it out character by character; use words instead.`,
      });
    }
    const letters = title.replace(/[^A-Za-z]/g, "");
    if (letters.length > 4 && letters === letters.toUpperCase()) {
      warnings.push({
        field,
        message: `"${title}" is all capitals. Some screen readers spell those out letter by letter, and they're harder to read; use normal capitalisation.`,
      });
    }
    if (!/[\p{L}\p{N}]/u.test(title)) {
      warnings.push({ field, message: `Link ${n}'s title has no words, only symbols or emoji. Add a few words.` });
    }
    const key = title.toLowerCase();
    if (!byTitle.has(key)) byTitle.set(key, new Set());
    byTitle.get(key)!.add(link.url.trim());
  });

  for (const [title, urls] of byTitle) {
    if (urls.size > 1) {
      const first = draft.links.find((link) => link.title.trim().toLowerCase() === title)!;
      warnings.push({
        field: `link-title-${first.id}`,
        message: `Several links are called "${first.title.trim()}" but go to different places. Give each a distinct title.`,
      });
    }
  }

  return warnings;
}
