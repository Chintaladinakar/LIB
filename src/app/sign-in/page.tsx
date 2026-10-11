import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { Panel } from "@/components/panel";
import { SITE_NAME } from "@/lib/site";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: `Sign in | ${SITE_NAME}`,
  robots: { index: false },
};

export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 sm:px-6">
      <Link href="/" className="mb-8 flex w-fit items-center gap-2.5 rounded-lg font-semibold tracking-tight">
        <BrandMark className="size-7" />
        {SITE_NAME}
      </Link>
      <Panel padding="p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Sign in or create your page</h1>
        <p className="mt-2 leading-relaxed text-pretty text-fg-soft">
          We&apos;ll email you a 6-digit code. There&apos;s no password to remember.
        </p>
        <SignInForm />
      </Panel>
    </main>
  );
}
