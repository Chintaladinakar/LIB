import "server-only";
import { createHash } from "node:crypto";

// Sends a new subscriber on to the creator's own Mailchimp audience or Kit form, using the API
// key they gave us. Both services email the subscriber to confirm, where the creator's account
// is set up for it (Mailchimp: always, since we add them as "pending").

export const NEWSLETTER_PROVIDERS = ["mailchimp", "kit"] as const;
export type NewsletterProvider = (typeof NEWSLETTER_PROVIDERS)[number];

export const PROVIDER_NAMES: Record<NewsletterProvider, string> = { mailchimp: "Mailchimp", kit: "Kit" };

export class NewsletterError extends Error {}

const TIMEOUT = 10_000;

// Mailchimp keys end in their data center, like "…-us21", which is also the API host.
function mailchimpBase(apiKey: string): string {
  const dc = apiKey.split("-").pop() ?? "";
  if (!/^[a-z]+\d+$/.test(dc)) throw new NewsletterError("That doesn't look like a Mailchimp API key. It should end in something like -us21.");
  return `https://${dc}.api.mailchimp.com/3.0`;
}

function mailchimpHeaders(apiKey: string) {
  return {
    authorization: `Basic ${Buffer.from(`key:${apiKey}`).toString("base64")}`,
    "content-type": "application/json",
  };
}

const KIT_API = "https://api.kit.com/v4";

function kitHeaders(apiKey: string) {
  return { "x-kit-api-key": apiKey, "content-type": "application/json", accept: "application/json" };
}

// Checks the key and list before they're saved, so mistakes show up in the dashboard right away.
// Returns the list's name.
export async function checkConnection(provider: NewsletterProvider, apiKey: string, listId: string): Promise<string> {
  const response =
    provider === "mailchimp"
      ? await call(`${mailchimpBase(apiKey)}/lists/${encodeURIComponent(listId)}?fields=name`, {
          headers: mailchimpHeaders(apiKey),
        })
      : await call(`${KIT_API}/forms?per_page=500`, { headers: kitHeaders(apiKey) });

  if (response.status === 401 || response.status === 403) {
    throw new NewsletterError(`${PROVIDER_NAMES[provider]} didn't accept that API key.`);
  }
  if (response.status === 404) throw new NewsletterError("No Mailchimp audience has that ID.");
  if (!response.ok) throw new NewsletterError(`${PROVIDER_NAMES[provider]} answered with an error (${response.status}).`);

  if (provider === "mailchimp") {
    const data = (await response.json().catch(() => ({}))) as { name?: string };
    return data.name ?? listId;
  }
  const data = (await response.json().catch(() => ({}))) as { forms?: { id: number | string; name?: string }[] };
  const form = data.forms?.find((item) => String(item.id) === listId);
  if (!form) throw new NewsletterError("None of your Kit forms has that ID.");
  return form.name ?? listId;
}

export async function addSubscriber(provider: NewsletterProvider, apiKey: string, listId: string, email: string) {
  if (provider === "mailchimp") {
    // PUT on the member's hash adds them or leaves an existing member as they are.
    const hash = createHash("md5").update(email.toLowerCase()).digest("hex");
    const response = await call(`${mailchimpBase(apiKey)}/lists/${encodeURIComponent(listId)}/members/${hash}`, {
      method: "PUT",
      headers: mailchimpHeaders(apiKey),
      body: JSON.stringify({ email_address: email, status_if_new: "pending" }),
    });
    if (!response.ok) throw new NewsletterError(await describe("Mailchimp", response));
    return;
  }

  // Kit adds people to a form only once they exist as subscribers.
  const created = await call(`${KIT_API}/subscribers`, {
    method: "POST",
    headers: kitHeaders(apiKey),
    body: JSON.stringify({ email_address: email }),
  });
  if (!created.ok) throw new NewsletterError(await describe("Kit", created));
  const added = await call(`${KIT_API}/forms/${encodeURIComponent(listId)}/subscribers`, {
    method: "POST",
    headers: kitHeaders(apiKey),
    body: JSON.stringify({ email_address: email }),
  });
  if (!added.ok) throw new NewsletterError(await describe("Kit", added));
}

async function call(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT) });
  } catch {
    throw new NewsletterError("Couldn't reach the newsletter service. Try again in a minute.");
  }
}

async function describe(name: string, response: Response): Promise<string> {
  const data = (await response.json().catch(() => ({}))) as { detail?: string; errors?: string[] };
  const detail = data.detail ?? data.errors?.[0];
  return `${name} refused a subscriber (${response.status})${detail ? `: ${detail.slice(0, 200)}` : "."}`;
}
