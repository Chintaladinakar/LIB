"use client";

import type { ReactNode } from "react";

// Section heading inside a dashboard panel.
export function PanelHeading({ id, title, children }: { id: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h2 id={id} className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </div>
  );
}

// A character counter that announces itself only when the limit is close.
export function Counter({ value, max, id }: { value: string; max: number; id: string }) {
  const left = max - value.length;
  return (
    <span id={id} className={`text-xs tabular-nums ${left < 20 ? "text-fg" : "text-muted"}`} aria-live={left < 20 ? "polite" : "off"}>
      {left} characters left
    </span>
  );
}

export function Toggle({
  id,
  checked,
  onChange,
  label,
  hint,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}) {
  // One label holds the visual switch and the text, so the name is announced once; the hint
  // sits outside it and is linked as a description.
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="relative mt-0.5 h-6 w-10 shrink-0 rounded-full bg-line-strong transition-colors duration-300 ease-spring peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-accent-text after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-on-accent after:shadow after:transition-transform after:duration-300 after:ease-spring peer-checked:after:translate-x-4"
        />
        <span className="text-sm font-medium text-fg">{label}</span>
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mt-0.5 pl-13 text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
