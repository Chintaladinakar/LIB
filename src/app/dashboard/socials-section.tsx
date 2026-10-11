"use client";

import { PlusIcon, SOCIAL_PLATFORMS, TrashIcon } from "@/components/icons";
import { Panel, iconButtonClass, inputClass, secondaryButtonClass } from "@/components/panel";
import { LIMITS, normalizeUrl, type ProfileDraft } from "@/lib/draft";
import { SOCIAL_PLATFORM_IDS, type SocialPlatform } from "@/lib/types";
import type { UpdateDraft } from "./editor";
import { PanelHeading } from "./fields";

const PLACEHOLDERS: Partial<Record<SocialPlatform, string>> = {
  email: "you@example.com",
  instagram: "instagram.com/you",
  tiktok: "tiktok.com/@you",
  youtube: "youtube.com/@you",
};

export function SocialsSection({ draft, update }: { draft: ProfileDraft; update: UpdateDraft }) {
  function add() {
    const used = new Set(draft.socials.map((social) => social.platform));
    const platform = SOCIAL_PLATFORM_IDS.find((id) => !used.has(id)) ?? "instagram";
    update((current) => ({
      ...current,
      socials: [...current.socials, { id: crypto.randomUUID(), platform, url: "" }],
    }));
  }

  const change = (id: string, patch: { platform?: SocialPlatform; url?: string }) =>
    update((current) => ({
      ...current,
      socials: current.socials.map((social) => (social.id === id ? { ...social, ...patch } : social)),
    }));

  return (
    <Panel aria-labelledby="socials-heading">
      <PanelHeading id="socials-heading" title="Social profiles">
        <button
          type="button"
          onClick={add}
          disabled={draft.socials.length >= LIMITS.socials}
          className={`${secondaryButtonClass} h-10 px-4 text-sm`}
        >
          <PlusIcon aria-hidden className="size-4" />
          Add profile
        </button>
      </PanelHeading>

      {draft.socials.length === 0 ? (
        <p className="text-fg-soft">These show as icons on your card. Add Instagram, TikTok, YouTube or an email address.</p>
      ) : (
        <ul className="space-y-3">
          {draft.socials.map((social) => {
            const { label } = SOCIAL_PLATFORMS[social.platform];
            return (
              // Wraps on narrow phones, so the address box keeps room to type in.
              <li key={social.id} className="flex flex-wrap items-center gap-2">
                <label htmlFor={`social-platform-${social.id}`} className="sr-only">
                  Platform
                </label>
                <select
                  id={`social-platform-${social.id}`}
                  value={social.platform}
                  onChange={(event) => change(social.id, { platform: event.target.value as SocialPlatform })}
                  // max-w, not w: inputClass sets w-full, which would otherwise win and push the
                  // address box and the remove button out of the panel.
                  className={`max-w-36 shrink-0 ${inputClass}`}
                >
                  {SOCIAL_PLATFORM_IDS.map((id) => (
                    <option key={id} value={id}>
                      {SOCIAL_PLATFORMS[id].label}
                    </option>
                  ))}
                </select>
                <label htmlFor={`social-url-${social.id}`} className="sr-only">
                  {social.platform === "email" ? "Email address" : `${label} address`}
                </label>
                <input
                  id={`social-url-${social.id}`}
                  type={social.platform === "email" ? "email" : "url"}
                  inputMode={social.platform === "email" ? "email" : "url"}
                  autoCapitalize="none"
                  spellCheck={false}
                  value={social.url.replace(/^mailto:/, "")}
                  placeholder={PLACEHOLDERS[social.platform] ?? "Profile address"}
                  onChange={(event) => change(social.id, { url: event.target.value })}
                  onBlur={(event) => change(social.id, { url: normalizeUrl(event.target.value) })}
                  className={`min-w-40 flex-1 ${inputClass}`}
                />
                <button
                  type="button"
                  onClick={() =>
                    update((current) => ({ ...current, socials: current.socials.filter((item) => item.id !== social.id) }))
                  }
                  className={iconButtonClass}
                >
                  <TrashIcon aria-hidden className="size-4" />
                  <span className="sr-only">Remove {label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
