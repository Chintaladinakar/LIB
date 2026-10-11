import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Encrypts third-party API keys that creators hand us (Mailchimp, Kit) before they're stored,
// so a database leak alone doesn't expose them. AES-256-GCM, keyed by SECRETS_KEY.

function key(): Buffer {
  const secret = process.env.SECRETS_KEY;
  if (!secret || secret.length < 32) throw new Error("SECRETS_KEY is not set (at least 32 characters).");
  // Hashing accepts any long random string, in any encoding.
  return createHash("sha256").update(secret).digest();
}

export function canEncrypt(): boolean {
  return (process.env.SECRETS_KEY?.length ?? 0) >= 32;
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `v1:${Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64")}`;
}

export function decrypt(sealed: string): string {
  if (!sealed.startsWith("v1:")) throw new Error("Unknown secret format.");
  const data = Buffer.from(sealed.slice(3), "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8");
}
