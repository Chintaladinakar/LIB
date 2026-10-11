"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { ImageSquareIcon, TrashIcon } from "@/components/icons";
import { Panel, inputClass, labelClass, secondaryButtonClass } from "@/components/panel";
import { LIMITS, type ProfileDraft } from "@/lib/draft";
import { mediaUrl } from "@/lib/profile-utils";
import { normalizeUsername } from "@/lib/usernames";
import { checkUsername } from "./actions";
import type { UpdateDraft } from "./editor";
import { Counter, PanelHeading } from "./fields";
import { uploadPhoto } from "./upload";

export function ProfileSection({
  draft,
  savedUsername,
  update,
  host,
  mediaBase,
}: {
  draft: ProfileDraft;
  savedUsername: string;
  update: UpdateDraft;
  host: string;
  mediaBase: string;
}) {
  const fileId = useId();
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<{ ok: boolean; message: string } | null>(null);

  // Only check usernames that differ from the saved one.
  useEffect(() => {
    if (!draft.username || draft.username === savedUsername) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      // Offline: show nothing; the server checks again on save.
      const result = await checkUsername(draft.username).catch(() => null);
      if (!cancelled) setAvailability(result);
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [draft.username, savedUsername]);
  const usernameStatus = draft.username && draft.username !== savedUsername ? availability : null;

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setPhotoError(null);
    const result = await uploadPhoto(file, "avatar");
    setUploading(false);
    if (result.ok) update((current) => ({ ...current, avatarKey: result.key }));
    else setPhotoError(result.error);
  }

  return (
    <Panel aria-labelledby="profile-heading">
      <PanelHeading id="profile-heading" title="Profile" />

      <div className="flex flex-wrap items-center gap-4">
        <span className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-subtle ring-4 ring-surface">
          {draft.avatarKey && mediaBase ? (
            <Image
              src={mediaUrl(mediaBase, draft.avatarKey)}
              alt="Your profile photo"
              fill
              sizes="80px"
              loading="eager"
              className="object-cover"
            />
          ) : (
            <ImageSquareIcon aria-hidden weight="light" className="size-7 text-muted" />
          )}
        </span>
        <div className="flex flex-wrap gap-2">
          <label htmlFor={fileId} className={`cursor-pointer ${secondaryButtonClass} h-10 px-4 text-sm`}>
            {uploading ? "Uploading…" : draft.avatarKey ? "Replace photo" : "Add a photo"}
          </label>
          <input
            id={fileId}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              onPhoto(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          {draft.avatarKey && (
            <button
              type="button"
              onClick={() => update((current) => ({ ...current, avatarKey: null }))}
              className={`${secondaryButtonClass} h-10 px-4 text-sm`}
            >
              <TrashIcon aria-hidden className="size-4" />
              Remove
            </button>
          )}
        </div>
        {photoError && (
          <p role="alert" className="w-full text-sm text-fg">
            {photoError}
          </p>
        )}
      </div>

      {/* One field per row, so the full page address fits in front of the username. */}
      <div className="mt-6 grid grid-cols-1 gap-5">
        <div>
          <label htmlFor="displayName" className={labelClass}>
            Name
          </label>
          <input
            id="displayName"
            value={draft.displayName}
            maxLength={LIMITS.displayName}
            autoComplete="name"
            onChange={(event) => update((current) => ({ ...current, displayName: event.target.value }))}
            className={`mt-2 ${inputClass}`}
          />
        </div>
        <div>
          <label htmlFor="username" className={labelClass}>
            Username
          </label>
          <div className="mt-2 flex items-center rounded-xl bg-page ring-1 ring-line focus-within:ring-line-strong">
            <span className="max-w-[45%] truncate pl-3.5 text-muted select-none" aria-hidden>
              {host}/
            </span>
            <input
              id="username"
              value={draft.username}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              aria-describedby="username-status"
              onChange={(event) =>
                update((current) => ({ ...current, username: normalizeUsername(event.target.value) }))
              }
              className="min-w-0 flex-1 rounded-r-xl bg-transparent py-2.5 pr-3.5 pl-0.5 text-base text-fg"
            />
          </div>
          <p id="username-status" aria-live="polite" className="mt-1.5 min-h-5 text-sm text-fg-soft">
            {usernameStatus?.message}
          </p>
        </div>
      </div>

      <div className="mt-1">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="bio" className={labelClass}>
            Bio
          </label>
          <Counter id="bio-count" value={draft.bio} max={LIMITS.bio} />
        </div>
        <textarea
          id="bio"
          rows={3}
          value={draft.bio}
          maxLength={LIMITS.bio}
          aria-describedby="bio-count"
          onChange={(event) => update((current) => ({ ...current, bio: event.target.value }))}
          className={`mt-2 resize-y ${inputClass}`}
        />
      </div>
    </Panel>
  );
}
