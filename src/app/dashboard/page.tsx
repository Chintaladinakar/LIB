import type { Metadata } from "next";
import { Suspense } from "react";
import { getStats } from "@/lib/analytics";
import { requireUser } from "@/lib/auth/session";
import { describeDomain } from "@/lib/domains";
import { getOwnedProfile, toDraft } from "@/lib/profile-store";
import { canEncrypt } from "@/lib/secrets";
import { SITE_NAME } from "@/lib/site";
import { siteUrl } from "@/lib/site-url";
import { mediaBaseUrl } from "@/lib/storage";
import { getNewsletterInfo, getSubscriberSummary } from "@/lib/subscribers";
import { suggestUsername } from "@/lib/usernames";
import { ClaimScreen } from "./claim-screen";
import { Editor } from "./editor";

export const metadata: Metadata = {
  title: `Your page | ${SITE_NAME}`,
  robots: { index: false },
};

// Everything here depends on who is signed in, so it renders per request behind <Suspense>;
// the skeleton is the static shell.
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const user = await requireUser();
  const owned = await getOwnedProfile(user.id);
  const site = siteUrl();

  if (!owned) {
    return (
      <ClaimScreen
        host={site.replace(/^https?:\/\//, "")}
        suggestion={suggestUsername(user.name) || suggestUsername(user.email)}
        name={user.name}
      />
    );
  }

  const [stats, subscribers, newsletter] = await Promise.all([
    getStats(owned.profile.id),
    getSubscriberSummary(owned.profile.id),
    getNewsletterInfo(owned.profile.id),
  ]);
  return (
    <Editor
      initial={toDraft(owned)}
      mediaBase={mediaBaseUrl()}
      siteUrl={site}
      stats={stats}
      domain={describeDomain(owned.profile)}
      subscribers={subscribers}
      newsletter={newsletter}
      canConnectNewsletter={canEncrypt()}
    />
  );
}

function DashboardSkeleton() {
  const tray = "rounded-[2rem] bg-shell ring-1 ring-shell-ring";
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 lg:px-8">
      <p role="status" className="sr-only">
        Loading your page
      </p>
      <div aria-hidden className="animate-pulse motion-reduce:animate-none">
        <div className="h-20" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-8">
          <div className="space-y-6">
            <div className={`h-72 ${tray}`} />
            <div className={`h-96 ${tray}`} />
          </div>
          <div className={`h-[34rem] ${tray}`} />
        </div>
      </div>
    </div>
  );
}
