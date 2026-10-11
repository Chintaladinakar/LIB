import "server-only";
import { AwsClient } from "aws4fetch";

// Neon Object Storage speaks the S3 API. aws4fetch signs plain fetch requests, which keeps the
// AWS SDK (several MB) out of the app. The bucket is public-read, so pages read files by URL.

function config() {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("Object storage is not configured. Set the AWS_* variables in .env.local.");
  }
  return {
    endpoint: endpoint.replace(/\/$/, ""),
    bucket: process.env.MEDIA_BUCKET ?? "media",
    client: new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: "s3",
      region: process.env.AWS_REGION ?? "us-east-2",
    }),
  };
}

// Base URL for public files, e.g. https://<branch>.storage.<host>/media. Empty when unset.
export function mediaBaseUrl(): string {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  return endpoint ? `${endpoint.replace(/\/$/, "")}/${process.env.MEDIA_BUCKET ?? "media"}` : "";
}

export async function putObject(key: string, body: Uint8Array, contentType: string): Promise<void> {
  const { endpoint, bucket, client } = config();
  const response = await client.fetch(`${endpoint}/${bucket}/${key}`, {
    method: "PUT",
    body: body as BodyInit,
    headers: {
      "content-type": contentType,
      // Keys are random and never reused, so files can be cached forever.
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
  if (!response.ok) {
    throw new Error(`Upload failed (${response.status}): ${(await response.text()).slice(0, 200)}`);
  }
}
