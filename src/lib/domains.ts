import "server-only";
import { randomBytes } from "node:crypto";
import { resolve4, resolveCname, resolveTxt } from "node:dns/promises";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { siteUrl } from "./site-url";

// Custom domains: a creator points a domain they own (yourname.com) at this site and their page
// shows there. Two DNS records do it:
// 1. A TXT record proving they control the domain, checked here before the domain goes live.
// 2. A CNAME (subdomains) or A record (bare domains) sending visitors to this site.
// next.config.ts then rewrites requests for any host that isn't this site to that page.
// The domain stays registered to the creator; we never buy or hold it.

export const TXT_LABEL = "_linkinbio";

export function siteHost(): string {
  return new URL(siteUrl()).hostname;
}

// "https://www.YourName.com/" → "www.yourname.com". Non-ASCII names come out as punycode.
export function normalizeDomain(input: string): string {
  const bare = input.trim().toLowerCase().replace(/^[a-z][a-z0-9+.-]*:\/\//, "").split(/[/?#]/)[0] ?? "";
  try {
    return new URL(`https://${bare}`).hostname.replace(/\.$/, "");
  } catch {
    return bare;
  }
}

const LABELS = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/;

export function domainProblem(domain: string): string | null {
  if (!domain) return "Enter a domain, like yourname.com.";
  if (domain.length > 253 || !LABELS.test(domain)) {
    return "That doesn't look like a domain. Enter it like yourname.com, without https://.";
  }
  const own = siteHost();
  if (domain === own || domain.endsWith(`.${own}`) || domain.endsWith(".vercel.app") || domain === "localhost") {
    return "That's this site's own address. Use a domain you own.";
  }
  return null;
}

// Bare domains (yourname.com, yourname.co.uk) can't have a CNAME, so they need an A record.
export function isApex(domain: string): boolean {
  const labels = domain.split(".");
  const secondLevelSuffix = /\.(co|com|net|org|gov|ac|edu)\.[a-z]{2}$/.test(domain);
  return labels.length === (secondLevelSuffix ? 3 : 2);
}

export type DnsRecord = { type: "TXT" | "CNAME" | "A"; name: string; value: string };

// What the creator adds at their domain registrar. The routing record's target comes from the
// host: DOMAIN_CNAME_TARGET (default: this site's host) and DOMAIN_A_RECORD (the host's IP).
export function dnsRecords(domain: string, token: string): { records: DnsRecord[]; missingA: boolean } {
  const records: DnsRecord[] = [{ type: "TXT", name: `${TXT_LABEL}.${domain}`, value: token }];
  if (isApex(domain)) {
    const ip = process.env.DOMAIN_A_RECORD;
    if (ip) records.push({ type: "A", name: domain, value: ip });
    return { records, missingA: !ip };
  }
  records.push({ type: "CNAME", name: domain, value: process.env.DOMAIN_CNAME_TARGET || siteHost() });
  return { records, missingA: false };
}

// What the dashboard shows about the creator's domain.
export type DomainInfo = { domain: string; verified: boolean; records: DnsRecord[]; missingA: boolean };

export function describeDomain(profile: {
  customDomain: string | null;
  domainToken: string | null;
  domainVerifiedAt: Date | null;
}): DomainInfo | null {
  if (!profile.customDomain || !profile.domainToken) return null;
  return {
    domain: profile.customDomain,
    verified: profile.domainVerifiedAt !== null,
    ...dnsRecords(profile.customDomain, profile.domainToken),
  };
}

export function newDomainToken(): string {
  return `lib-${randomBytes(16).toString("hex")}`;
}

// True when the TXT record holds the token. DNS changes can take minutes to hours to appear.
export async function hasVerificationRecord(domain: string, token: string): Promise<boolean> {
  try {
    const records = await resolveTxt(`${TXT_LABEL}.${domain}`);
    return records.some((chunks) => chunks.join("").trim() === token);
  } catch {
    return false;
  }
}

// Whether visitors to the domain reach this site yet. Informational only: some DNS providers
// "flatten" a CNAME into A records, so a mismatch isn't proof of a mistake.
export async function pointsHere(domain: string): Promise<boolean> {
  const target = (process.env.DOMAIN_CNAME_TARGET || siteHost()).replace(/\.$/, "");
  try {
    if (isApex(domain)) {
      const ip = process.env.DOMAIN_A_RECORD;
      return Boolean(ip) && (await resolve4(domain)).includes(ip!);
    }
    const names = await resolveCname(domain).catch(() => [] as string[]);
    if (names.some((name) => name.replace(/\.$/, "") === target)) return true;
    const [mine, theirs] = await Promise.all([resolve4(target), resolve4(domain)]);
    return theirs.some((ip) => mine.includes(ip));
  } catch {
    return false;
  }
}

// Database ------------------------------------------------------------------------------------

// Returns false when another page already uses the domain.
export async function claimDomain(profileId: string, domain: string, token: string): Promise<boolean> {
  try {
    await getDb()
      .update(schema.profiles)
      .set({ customDomain: domain, domainToken: token, domainVerifiedAt: null, updatedAt: new Date() })
      .where(eq(schema.profiles.id, profileId));
    return true;
  } catch (error) {
    if (isUniqueViolation(error)) return false;
    throw error;
  }
}

export async function markDomainVerified(profileId: string): Promise<void> {
  await getDb()
    .update(schema.profiles)
    .set({ domainVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.profiles.id, profileId));
}

export async function releaseDomain(profileId: string): Promise<void> {
  await getDb()
    .update(schema.profiles)
    .set({ customDomain: null, domainToken: null, domainVerifiedAt: null, updatedAt: new Date() })
    .where(eq(schema.profiles.id, profileId));
}

// Postgres' unique_violation; drizzle sometimes wraps the driver's error in `cause`.
function isUniqueViolation(error: unknown): boolean {
  const { code, cause } = (error ?? {}) as { code?: string; cause?: { code?: string } };
  return (code ?? cause?.code) === "23505";
}

// Hosting -------------------------------------------------------------------------------------

// On Vercel, a domain also has to be added to the project before Vercel serves it and issues
// its HTTPS certificate. With VERCEL_API_TOKEN and VERCEL_PROJECT_ID set, that happens on
// verification and removal; other hosts need the equivalent step (see the README).
export async function attachToHost(domain: string): Promise<void> {
  const api = vercelApi();
  if (!api) return;
  const response = await fetch(api.url(`/v10/projects/${api.project}/domains`), {
    method: "POST",
    headers: api.headers,
    body: JSON.stringify({ name: domain }),
    signal: AbortSignal.timeout(10_000),
  });
  // 409: already on the project.
  if (!response.ok && response.status !== 409) {
    throw new Error(`Vercel didn't add ${domain} (${response.status}).`);
  }
}

export async function detachFromHost(domain: string): Promise<void> {
  const api = vercelApi();
  if (!api) return;
  await fetch(api.url(`/v9/projects/${api.project}/domains/${encodeURIComponent(domain)}`), {
    method: "DELETE",
    headers: api.headers,
    signal: AbortSignal.timeout(10_000),
  }).catch(() => {});
}

function vercelApi() {
  const token = process.env.VERCEL_API_TOKEN;
  const project = process.env.VERCEL_PROJECT_ID;
  if (!token || !project) return null;
  const team = process.env.VERCEL_TEAM_ID;
  return {
    project: encodeURIComponent(project),
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    url: (path: string) => `https://api.vercel.com${path}${team ? `?teamId=${encodeURIComponent(team)}` : ""}`,
  };
}
