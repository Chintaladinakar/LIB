import { CheckCircleIcon, LINK_ICONS } from "@/components/icons";
import { SignupForm } from "@/components/signup-form";
import { PLATE, SHELL, SPAN } from "@/components/tile-styles";
import type { ProfileLink } from "@/lib/types";

// An email sign-up tile. Everything but the form renders here on the server; SignupForm is the
// only part that runs in the browser.
// Without JavaScript the form posts normally and /api/subscribe sends the visitor back to
// #subscribed-<id> (or #invalid-<id>), which reveals the matching message below through CSS
// :target.
export function EmailTile({
  link,
  profileId,
  className = "",
}: {
  link: ProfileLink;
  // Missing on the demo page and in previews, which can't collect addresses.
  profileId?: string;
  className?: string;
}) {
  const Icon = LINK_ICONS[link.icon || "newsletter"];
  const titleId = `signup-${link.id}`;
  const done = <CheckCircleIcon aria-hidden weight="fill" className="size-5 shrink-0 text-accent-text" />;

  return (
    <li data-ends-at={link.endsAt} className={`group/signup @container ${SPAN[link.size === "large" ? "large" : "wide"]} ${className}`}>
      <div className={`h-full ${SHELL}`}>
        <div className={`${PLATE} flex flex-col gap-3 bg-surface p-4 shadow-[inset_0_1px_0_var(--highlight)] @[26rem]:p-5`}>
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-subtle text-accent-text">
              <Icon aria-hidden weight="light" className="size-[22px]" />
            </span>
            <div className="min-w-0">
              <p id={titleId} className="leading-tight font-semibold text-pretty wrap-anywhere @[26rem]:text-lg">
                {link.title}
              </p>
              {link.description && (
                // Gives its place to the form's error message while one shows.
                <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted wrap-anywhere group-has-[[data-signup-error]]/signup:hidden">
                  {link.description}
                </p>
              )}
              <p id={`invalid-${link.id}`} className="mt-0.5 hidden text-sm font-medium text-fg target:block">
                Enter an email address, like name@example.com.
              </p>
            </div>
          </div>
          <p
            id={`subscribed-${link.id}`}
            className="mt-auto hidden items-center gap-2 rounded-full bg-subtle px-4 py-2.5 text-sm font-medium target:flex"
          >
            {done}
            You&apos;re on the list. Thanks for signing up!
          </p>
          <SignupForm linkId={link.id} profileId={profileId} labelledBy={titleId} doneIcon={done} />
        </div>
      </div>
    </li>
  );
}
