"use client";

import Image from "next/image";
import { useId, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ClockIcon,
  EnvelopeSimpleIcon,
  ImageSquareIcon,
  LINK_ICONS,
  MapPinIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/icons";
import { Panel, iconButtonClass, inputClass, labelClass, secondaryButtonClass } from "@/components/panel";
import { appLinkFor } from "@/lib/app-links";
import { LIMITS, newLink, normalizeUrl, type DraftLink, type ProfileDraft } from "@/lib/draft";
import { MAP_SEARCH, embedFor, isMapUrl } from "@/lib/embeds";
import { mediaUrl } from "@/lib/profile-utils";
import { scheduleState } from "@/lib/schedule";
import { LINK_ICON_IDS, type LinkIcon } from "@/lib/types";
import { useHydrated } from "@/lib/use-hydrated";
import type { UpdateDraft } from "./editor";
import { Counter, PanelHeading, Toggle } from "./fields";
import { uploadPhoto } from "./upload";

const ICON_LABELS: Record<LinkIcon, string> = {
  video: "Video",
  camera: "Photos",
  shop: "Shop",
  newsletter: "Newsletter",
  calendar: "Booking",
  music: "Music",
  podcast: "Podcast",
  website: "Website",
  map: "Location",
};

const APP_NAMES: [RegExp, string][] = [
  [/youtu/, "YouTube"],
  [/spotify/, "Spotify"],
  [/amazon/, "Amazon"],
];

const PLAYER_NAMES = { youtube: "YouTube", spotify: "Spotify" } as const;

export function LinksSection({
  draft,
  update,
  mediaBase,
  clicks,
}: {
  draft: ProfileDraft;
  update: UpdateDraft;
  mediaBase: string;
  clicks: Record<string, number>;
}) {
  const [justAdded, setJustAdded] = useState<string | null>(null);

  function add(partial: Partial<DraftLink> = {}) {
    const link = newLink(partial);
    update((current) => ({ ...current, links: [link, ...current.links] }));
    setJustAdded(link.id);
  }

  const atLimit = draft.links.length >= LIMITS.links;
  const addButton = `${secondaryButtonClass} h-10 px-4 text-sm`;

  return (
    <Panel aria-labelledby="links-heading">
      <PanelHeading id="links-heading" title={`Links (${draft.links.length})`}>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => add()} disabled={atLimit} className={addButton}>
            <PlusIcon aria-hidden className="size-4" />
            Add link
          </button>
          <button
            type="button"
            onClick={() => add({ kind: "email", size: "wide", icon: "newsletter" })}
            disabled={atLimit}
            className={addButton}
          >
            <EnvelopeSimpleIcon aria-hidden className="size-4" />
            Sign-up form
          </button>
          <button
            type="button"
            onClick={() => add({ kind: "embed", url: MAP_SEARCH, size: "wide" })}
            disabled={atLimit}
            className={addButton}
          >
            <MapPinIcon aria-hidden className="size-4" />
            Map
          </button>
        </div>
      </PanelHeading>

      {draft.links.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong px-5 py-6 text-fg-soft">
          No links yet. Add one, or import your Linktree further down.
        </p>
      ) : (
        <ol className="space-y-3">
          {draft.links.map((link, index) => (
            <LinkItem
              key={link.id}
              link={link}
              index={index}
              count={draft.links.length}
              update={update}
              mediaBase={mediaBase}
              clicks={clicks[link.id] ?? 0}
              autoFocus={link.id === justAdded}
            />
          ))}
        </ol>
      )}
    </Panel>
  );
}

function LinkItem({
  link,
  index,
  count,
  update,
  mediaBase,
  clicks,
  autoFocus,
}: {
  link: DraftLink;
  index: number;
  count: number;
  update: UpdateDraft;
  mediaBase: string;
  clicks: number;
  autoFocus: boolean;
}) {
  const uid = useId();
  const [open, setOpen] = useState(autoFocus);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const isEmail = link.kind === "email";
  const isMap = link.kind === "embed" && isMapUrl(link.url);
  // YouTube and Spotify links can play in their tile instead of opening the site.
  const player = !isMap ? embedFor(link.url) : null;
  const playerName = player && player.provider !== "map" ? PLAYER_NAMES[player.provider] : null;
  const appName =
    link.kind === "link" && appLinkFor(link.url) ? APP_NAMES.find(([pattern]) => pattern.test(link.url))?.[1] : undefined;

  const fallbackName = isEmail ? "Sign-up form" : isMap ? "Map" : `Link ${index + 1}`;
  const label = link.title.trim() || fallbackName;
  const tile = link.featured ? "featured" : link.size;
  const tileChoices =
    link.kind === "link"
      ? [
          ["small", "Square", "1 × 1"],
          ["wide", "Wide", "2 × 1"],
          ["featured", "Featured", "2 × 2, blue"],
        ]
      : [
          ["wide", "Wide", "2 × 1"],
          ["large", "Large", "2 × 2"],
        ];

  const change = (patch: Partial<DraftLink>) =>
    update((current) => ({
      ...current,
      links: current.links.map((item) => (item.id === link.id ? { ...item, ...patch } : item)),
    }));

  const move = (offset: number) =>
    update((current) => {
      const links = [...current.links];
      const [item] = links.splice(index, 1);
      links.splice(index + offset, 0, item);
      return { ...current, links };
    });

  const setTile = (value: string) =>
    update((current) => ({
      ...current,
      links: current.links.map((item) => {
        if (item.id !== link.id) return value === "featured" ? { ...item, featured: false } : item;
        return value === "featured"
          ? { ...item, featured: true }
          : { ...item, featured: false, size: value === "large" ? "large" : value === "wide" ? "wide" : "small" };
      }),
    }));

  // Players and sign-up forms need at least two cells of width and are never the blue tile.
  const setPlaysHere = (playsHere: boolean) =>
    change(
      playsHere
        ? { kind: "embed", featured: false, size: link.featured || link.size === "large" ? "large" : "wide" }
        : { kind: "link" },
    );

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setPhotoError(null);
    const result = await uploadPhoto(file, "tile");
    setUploading(false);
    if (result.ok) change({ imageKey: result.key });
    else setPhotoError(result.error);
  }

  const Icon = isEmail ? EnvelopeSimpleIcon : isMap ? MapPinIcon : link.icon ? LINK_ICONS[link.icon] : null;

  return (
    <li className="rounded-2xl bg-page/60 p-4 ring-1 ring-line">
      <div className="flex items-start gap-3">
        <span className="relative mt-7 grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-subtle text-accent-text">
          {link.imageKey && mediaBase ? (
            <Image src={mediaUrl(mediaBase, link.imageKey)} alt="" fill sizes="44px" className="object-cover" />
          ) : Icon ? (
            <Icon aria-hidden weight="light" className="size-[22px]" />
          ) : (
            <span aria-hidden className="text-sm font-semibold">
              {index + 1}
            </span>
          )}
        </span>

        <div className={`grid min-w-0 flex-1 grid-cols-1 gap-3 ${isEmail ? "" : "sm:grid-cols-2"}`}>
          <div>
            <label htmlFor={`link-title-${link.id}`} className={labelClass}>
              {isEmail ? "Heading" : "Title"}
            </label>
            <input
              id={`link-title-${link.id}`}
              value={link.title}
              maxLength={LIMITS.title}
              autoFocus={autoFocus}
              placeholder={isEmail ? "Get my monthly letter" : isMap ? "My studio" : "Latest video"}
              onChange={(event) => change({ title: event.target.value })}
              className={`mt-1.5 ${inputClass}`}
            />
          </div>
          {isMap ? (
            <div>
              <label htmlFor={`link-url-${link.id}`} className={labelClass}>
                Address or place
              </label>
              <input
                id={`link-url-${link.id}`}
                value={placeOf(link.url)}
                autoComplete="street-address"
                placeholder="221B Baker Street, London"
                onChange={(event) => change({ url: `${MAP_SEARCH}${encodeURIComponent(event.target.value)}` })}
                className={`mt-1.5 ${inputClass}`}
              />
            </div>
          ) : (
            !isEmail && (
              <div>
                <label htmlFor={`link-url-${link.id}`} className={labelClass}>
                  Web address
                </label>
                <input
                  id={`link-url-${link.id}`}
                  type="url"
                  inputMode="url"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={link.url}
                  placeholder="youtube.com/…"
                  onChange={(event) => change({ url: event.target.value })}
                  onBlur={(event) => change({ url: normalizeUrl(event.target.value) })}
                  className={`mt-1.5 ${inputClass}`}
                />
              </div>
            )
          )}
        </div>

        <div className="mt-7 flex shrink-0 flex-col gap-1.5">
          <button type="button" onClick={() => move(-1)} disabled={index === 0} className={iconButtonClass}>
            <ArrowUpIcon aria-hidden className="size-4" />
            <span className="sr-only">Move {label} up</span>
          </button>
          <button type="button" onClick={() => move(1)} disabled={index === count - 1} className={iconButtonClass}>
            <ArrowDownIcon aria-hidden className="size-4" />
            <span className="sr-only">Move {label} down</span>
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pl-14">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${uid}-options`}
          onClick={() => setOpen(!open)}
          className="rounded-full py-1 text-sm font-medium text-accent-text underline-offset-4 hover:underline"
        >
          {open ? "Fewer options" : "More options"}
        </button>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted tabular-nums">
          <ScheduleBadge link={link} />
          {!isEmail && (
            <span>
              {clicks} {link.kind === "embed" ? (clicks === 1 ? "play" : "plays") : clicks === 1 ? "click" : "clicks"} in 30
              days
            </span>
          )}
        </span>
      </div>

      {open && (
        <div id={`${uid}-options`} className="mt-4 space-y-5 border-t border-line pt-4 sm:pl-14">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor={`${uid}-description`} className={labelClass}>
                Short description <span className="font-normal text-muted">(optional)</span>
              </label>
              <Counter id={`${uid}-description-count`} value={link.description} max={LIMITS.description} />
            </div>
            <input
              id={`${uid}-description`}
              value={link.description}
              maxLength={LIMITS.description}
              placeholder={isEmail ? "One email a month. Unsubscribe any time." : undefined}
              aria-describedby={`${uid}-description-count`}
              onChange={(event) => change({ description: event.target.value })}
              className={`mt-1.5 ${inputClass}`}
            />
          </div>

          {playerName && (
            <Toggle
              id={`${uid}-plays-here`}
              checked={link.kind === "embed"}
              onChange={setPlaysHere}
              label={`Play on your page`}
              hint={`Visitors play it right in the tile instead of leaving for ${playerName}. The player loads only when tapped, so your page stays fast.`}
            />
          )}

          <fieldset>
            <legend className={labelClass}>Tile</legend>
            <div className={`mt-2 grid gap-2 ${tileChoices.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
              {tileChoices.map(([value, name, detail]) => (
                <label
                  key={value}
                  className="cursor-pointer rounded-xl bg-surface px-3 py-2.5 text-center ring-1 ring-line transition duration-200 ease-spring has-[:checked]:ring-2 has-[:checked]:ring-accent-text has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-text"
                >
                  <input
                    type="radio"
                    name={`${uid}-tile`}
                    value={value}
                    checked={tile === value}
                    onChange={() => setTile(value)}
                    className="sr-only"
                  />
                  <span className="block text-sm font-medium">{name}</span>
                  <span className="block text-xs text-muted">{detail}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor={`${uid}-icon`} className={labelClass}>
                Icon
              </label>
              <select
                id={`${uid}-icon`}
                value={link.icon}
                onChange={(event) => change({ icon: event.target.value as DraftLink["icon"] })}
                className={`mt-1.5 ${inputClass}`}
              >
                <option value="">{isEmail || isMap || playerName ? "Automatic" : "No icon"}</option>
                {LINK_ICON_IDS.map((id) => (
                  <option key={id} value={id}>
                    {ICON_LABELS[id]}
                  </option>
                ))}
              </select>
            </div>
            {!isEmail && (
              <div>
                <span className={labelClass} id={`${uid}-photo-label`}>
                  Photo <span className="font-normal text-muted">(optional)</span>
                </span>
                <div className="mt-1.5 flex flex-wrap gap-2" role="group" aria-labelledby={`${uid}-photo-label`}>
                  <label htmlFor={`${uid}-photo`} className={`cursor-pointer ${secondaryButtonClass} h-10 px-4 text-sm`}>
                    <ImageSquareIcon aria-hidden className="size-4" />
                    {uploading ? "Uploading…" : link.imageKey ? "Replace" : "Add photo"}
                  </label>
                  <input
                    id={`${uid}-photo`}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={uploading}
                    onChange={(event) => {
                      onPhoto(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                  {link.imageKey && (
                    <button type="button" onClick={() => change({ imageKey: null })} className={`${secondaryButtonClass} h-10 px-4 text-sm`}>
                      Remove
                    </button>
                  )}
                </div>
                {photoError && (
                  <p role="alert" className="mt-1.5 text-sm text-fg">
                    {photoError}
                  </p>
                )}
              </div>
            )}
          </div>

          {appName && (
            <Toggle
              id={`${uid}-app`}
              checked={link.openInApp}
              onChange={(openInApp) => change({ openInApp })}
              label={`Open in the ${appName} app`}
              hint={`When someone taps this inside Instagram or TikTok, open the ${appName} app instead of a web page where they aren't signed in.`}
            />
          )}

          <ScheduleFields link={link} change={change} uid={uid} />

          <button
            type="button"
            onClick={() =>
              update((current) => ({ ...current, links: current.links.filter((item) => item.id !== link.id) }))
            }
            className="inline-flex items-center gap-2 rounded-full py-1 text-left text-sm font-medium text-fg-soft wrap-anywhere hover:text-fg"
          >
            <TrashIcon aria-hidden className="size-4" />
            Delete {label}
          </button>
        </div>
      )}
    </li>
  );
}

// The place a map tile shows, exactly as typed (spaces included) so the field edits naturally.
function placeOf(url: string): string {
  try {
    return new URL(url).searchParams.get("query") ?? "";
  } catch {
    return "";
  }
}

// The schedule in the creator's own timezone. This only renders in the browser (the options
// open on click), so local times never differ between server and browser HTML.
function ScheduleFields({ link, change, uid }: { link: DraftLink; change: (patch: Partial<DraftLink>) => void; uid: string }) {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const fields = [
    ["startsAt", "Show from"],
    ["endsAt", "Hide after"],
  ] as const;

  return (
    <fieldset>
      <legend className={labelClass}>
        Schedule <span className="font-normal text-muted">(optional)</span>
      </legend>
      <p id={`${uid}-schedule-hint`} className="mt-0.5 text-sm text-muted">
        Show this tile only between these times, in your timezone ({zone.replace(/_/g, " ")}). Leave either empty for no limit.
      </p>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map(([field, name]) => (
          <div key={field}>
            <label htmlFor={`${uid}-${field}`} className="block text-sm text-fg-soft">
              {name}
            </label>
            <input
              id={`${uid}-${field}`}
              type="datetime-local"
              value={toLocalInput(link[field])}
              aria-describedby={`${uid}-schedule-hint`}
              onChange={(event) => change({ [field]: event.target.value ? new Date(event.target.value).toISOString() : null })}
              className={`mt-1.5 ${inputClass}`}
            />
          </div>
        ))}
      </div>
      {(link.startsAt || link.endsAt) && (
        <button
          type="button"
          onClick={() => change({ startsAt: null, endsAt: null })}
          className="mt-2 rounded-full py-1 text-sm font-medium text-accent-text underline-offset-4 hover:underline"
        >
          Clear schedule
        </button>
      )}
    </fieldset>
  );
}

// "2026-10-11T09:30" in local time, the format datetime-local inputs use.
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// "Starts 12 Oct, 09:00", "Until 1 Nov, 18:00" or "Ended", next to the click count. Dates appear
// once the page runs in the browser, which knows the creator's timezone.
function ScheduleBadge({ link }: { link: DraftLink }) {
  const hydrated = useHydrated();
  if (!link.startsAt && !link.endsAt) return null;
  const state = scheduleState(link);
  const when = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  let text = "Scheduled";
  if (state === "ended") text = "Ended, hidden from your page";
  else if (hydrated && state === "upcoming" && link.startsAt) text = `Starts ${when(link.startsAt)}`;
  else if (hydrated && link.endsAt) text = `Until ${when(link.endsAt)}`;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-subtle px-2 py-0.5 font-medium text-fg-soft">
      <ClockIcon aria-hidden className="size-3.5" />
      {text}
    </span>
  );
}
