import type { TileSize } from "@/lib/types";

// Class names every bento tile shares. A module of its own, so the small browser-side tile
// parts can use them without pulling the tile faces (and their icons) into the page's JavaScript.

export const SPAN: Record<TileSize, string> = {
  small: "col-span-1 row-span-1",
  wide: "col-span-2 row-span-1",
  large: "col-span-2 row-span-2",
};

// The tile's outer shell: a tray that the face's plate lifts out of.
export const SHELL = "rounded-[1.75rem] bg-shell p-1.5 shadow-tile ring-1 ring-shell-ring";

// The inner plate every face sits on. It lifts off the outer shell while the tile is tilted.
export const PLATE = "relative h-full rounded-[1.375rem] transform-3d lift-1";
