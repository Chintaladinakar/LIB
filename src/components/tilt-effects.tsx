"use client";

import { useEffect } from "react";

// Tilts whichever [data-tilt] element is under the mouse toward the pointer. It only writes
// CSS variables (see "3D tilt" in globals.css): one delegated listener for the whole page, at
// most one style write per frame, and no React state. data-tilt="8" sets the maximum angle.
// Touch screens and reduced-motion visitors get nothing, so their cards stay flat.
//
// Render it once per page, after the tilt targets and inside the same <Suspense> boundary.
// Its effect then starts only once React has hydrated them: writing attributes onto
// server-rendered HTML that React has not hydrated yet makes React report a mismatch.
export function TiltEffects() {
  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reduceMotion) return;

    let active: HTMLElement | null = null;
    let pointer = { x: 0, y: 0 };
    let frame = 0;

    const release = () => {
      if (!active) return;
      for (const name of ["--rx", "--ry", "--gx", "--gy"]) active.style.removeProperty(name);
      delete active.dataset.tilting;
      active = null;
    };

    const update = () => {
      frame = 0;
      if (!active) return;
      // The [data-tilt] element itself never rotates (its child does), so this rect is stable.
      const rect = active.getBoundingClientRect();
      const x = Math.min(Math.max((pointer.x - rect.left) / rect.width, 0), 1);
      const y = Math.min(Math.max((pointer.y - rect.top) / rect.height, 0), 1);
      const max = Number(active.dataset.tilt) || 8;
      active.style.setProperty("--rx", `${((0.5 - y) * max).toFixed(2)}deg`);
      active.style.setProperty("--ry", `${((x - 0.5) * max).toFixed(2)}deg`);
      active.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
      active.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
      active.dataset.tilting = "";
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const target = (event.target as Element | null)?.closest<HTMLElement>("[data-tilt]") ?? null;
      if (target !== active) {
        release();
        active = target;
      }
      pointer = { x: event.clientX, y: event.clientY };
      if (active && !frame) frame = requestAnimationFrame(update);
    };

    // relatedTarget is null when the pointer leaves the window entirely.
    const onOut = (event: PointerEvent) => {
      if (!event.relatedTarget) release();
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });
    window.addEventListener("blur", release);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
      window.removeEventListener("blur", release);
      cancelAnimationFrame(frame);
      release();
    };
  }, []);

  return null;
}
