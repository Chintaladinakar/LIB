import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <div className="rounded-[2rem] bg-shell p-2 shadow-tile ring-1 ring-shell-ring">
        <div className="rounded-[1.5rem] bg-surface p-7 shadow-[inset_0_1px_0_var(--highlight)] sm:p-9">
          <p className="text-sm font-medium text-muted">404</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance">
            This page doesn&apos;t exist
          </h1>
          <p className="mt-3 leading-relaxed text-pretty text-fg-soft">
            The username may be misspelled, or the page was removed.
          </p>
          <Link
            href="/"
            className="group mt-8 inline-flex h-12 items-center gap-3 rounded-full bg-accent py-1.5 pr-1.5 pl-5 font-medium text-on-accent transition duration-300 ease-spring select-none hover:bg-accent-hover active:scale-[0.98]"
          >
            Go home
            <span className="grid size-9 place-items-center rounded-full bg-on-accent/15 transition-transform duration-300 ease-spring group-hover:translate-x-0.5">
              <ArrowRightIcon aria-hidden className="size-4" />
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
