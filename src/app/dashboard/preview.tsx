"use client";

import { useState } from "react";
import { ProfileView } from "@/components/profile-view";
import type { Profile } from "@/lib/types";

// The real profile component, rendered from the unsaved draft. Each mode renders at a true
// device width (so container queries pick that layout) and is zoomed to fit the column.
// Inert: it's a picture of the page, not a second set of working links.
export function PreviewPanel({ profile }: { profile: Profile }) {
  const [mode, setMode] = useState<"phone" | "desktop">("phone");

  return (
    <div className="rounded-[2rem] bg-shell p-2 shadow-tile ring-1 ring-shell-ring">
      <div className="flex items-center justify-between gap-3 px-3 pt-2 pb-3">
        <h2 className="text-sm font-semibold">Preview</h2>
        <div role="radiogroup" aria-label="Preview size" className="flex rounded-full bg-page p-1 ring-1 ring-line">
          {(["phone", "desktop"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => setMode(value)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition duration-200 ease-spring ${
                mode === value ? "bg-surface text-fg shadow-sm ring-1 ring-line" : "text-muted hover:text-fg"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[34rem] overflow-y-auto overscroll-contain rounded-[1.5rem] bg-page lg:h-[calc(100dvh-9rem)]">
        <div inert className={mode === "phone" ? "p-3" : "w-[1024px] p-6 [zoom:0.35]"}>
          <ProfileView profile={profile} preview />
        </div>
      </div>
    </div>
  );
}
