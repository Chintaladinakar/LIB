// Username rules, shared by the server and the claim form.

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;

// Lowercase letters, digits, dot, underscore and hyphen. Must start and end with a letter or
// digit so URLs never look like "/.name" or "/name-".
const PATTERN = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;

// Paths the app uses or may use, plus names that could be mistaken for the product.
const RESERVED = new Set([
  "about", "account", "admin", "api", "app", "apple-icon", "assets", "auth", "billing", "blog",
  "contact", "custom-domain", "dashboard", "demo", "docs", "edit", "explore", "faq", "favicon.ico", "help",
  "home", "icon", "login", "logout", "media", "new", "null", "opengraph-image", "pricing",
  "privacy", "robots.txt", "settings", "sign-in", "sign-out", "sign-up", "signin", "signup",
  "sitemap.xml", "static", "status", "support", "terms", "undefined", "www", "_next",
]);

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase().replace(/^@/, "");
}

// Returns a message for the person, or null when the username is acceptable.
export function usernameProblem(username: string): string | null {
  if (username.length < USERNAME_MIN) return `Use at least ${USERNAME_MIN} characters.`;
  if (username.length > USERNAME_MAX) return `Use at most ${USERNAME_MAX} characters.`;
  if (!PATTERN.test(username)) {
    return "Use lowercase letters, numbers, dots, dashes or underscores, starting and ending with a letter or number.";
  }
  if (RESERVED.has(username)) return "That name is reserved. Try another.";
  return null;
}

// A starting suggestion from an email address or display name.
export function suggestUsername(source: string): string {
  const base = normalizeUsername(source.split("@")[0] ?? "")
    .replace(/[^a-z0-9._-]+/g, "")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, USERNAME_MAX);
  return base.length >= USERNAME_MIN ? base : "";
}
