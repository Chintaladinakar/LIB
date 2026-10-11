import type { ReactNode } from "react";

// The double-bezel card used across the app: a soft tray with a lifted plate inside it.
// Same shell, ring, radii and shadow as the profile tiles.
export function Panel({
  children,
  className = "",
  padding = "p-5 sm:p-6",
  as: Root = "section",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  padding?: string;
  as?: "section" | "div";
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">) {
  return (
    <Root className={`rounded-[2rem] bg-shell p-2 shadow-tile ring-1 ring-shell-ring ${className}`} {...rest}>
      <div className={`h-full rounded-[1.5rem] bg-surface shadow-[inset_0_1px_0_var(--highlight)] ${padding}`}>
        {children}
      </div>
    </Root>
  );
}

// Shared form styles, so every input in the app looks and behaves the same. 16px text keeps
// iOS from zooming into fields.
export const inputClass =
  "block w-full rounded-xl bg-page px-3.5 py-2.5 text-base text-fg ring-1 ring-line placeholder:text-muted transition-shadow duration-200 ease-spring hover:ring-line-strong";

export const labelClass = "block text-sm font-medium text-fg-soft";

export const primaryButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 font-medium text-on-accent transition duration-300 ease-spring select-none hover:bg-accent-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-surface px-5 font-medium text-fg ring-1 ring-line transition duration-300 ease-spring select-none hover:bg-surface-hover hover:ring-line-strong active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60";

export const iconButtonClass =
  "grid size-10 shrink-0 place-items-center rounded-full text-fg-soft ring-1 ring-line transition duration-300 ease-spring select-none hover:bg-surface-hover hover:text-fg active:scale-95 disabled:pointer-events-none disabled:opacity-40";
