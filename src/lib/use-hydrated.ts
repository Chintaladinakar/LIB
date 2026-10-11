import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

// False in server HTML and during hydration, true once React runs in the browser. For output that
// differs between the two, like local times or a button that replaces a plain link.
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
}
