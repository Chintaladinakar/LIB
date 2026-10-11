"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SHELL } from "@/components/tile-styles";
import { useHydrated } from "@/lib/use-hydrated";

const FACE = `tilt-surface group block h-full w-full ${SHELL} text-left select-none active:scale-[0.98]`;

// The browser half of EmbedTile: swaps the server-rendered face (children) for the player when
// tapped. Before JavaScript runs the face is a plain link to the same place, which also keeps
// exported pages working.
export function EmbedPlayer({
  linkId,
  href,
  src,
  title,
  endsAt,
  className,
  children,
}: {
  linkId: string;
  href: string;
  src: string;
  title: string;
  endsAt?: string;
  className: string;
  children: ReactNode;
}) {
  const hydrated = useHydrated();
  const [playing, setPlaying] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  // The button that had focus is gone; keyboard users continue inside the player.
  useEffect(() => {
    if (playing) frame.current?.focus();
  }, [playing]);

  if (playing) {
    return (
      <li data-ends-at={endsAt} className={className}>
        <div className={`h-full ${SHELL}`}>
          <iframe
            ref={frame}
            src={src}
            title={title}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-full w-full rounded-[1.375rem] bg-subtle"
          />
        </div>
      </li>
    );
  }

  return (
    <li data-tilt="7" data-ends-at={endsAt} className={`@container ${className}`}>
      {hydrated ? (
        <button type="button" data-link-id={linkId} onClick={() => setPlaying(true)} className={FACE}>
          {children}
        </button>
      ) : (
        <a href={href} data-link-id={linkId} className={FACE}>
          {children}
        </a>
      )}
    </li>
  );
}
