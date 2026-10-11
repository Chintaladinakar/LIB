// The product mark: two link rows on the accent tile. src/app/icon.tsx draws the same shape.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect width="32" height="32" rx="9" className="fill-accent" />
      <rect x="7" y="10" width="18" height="5" rx="2.5" className="fill-on-accent" />
      <rect x="7" y="17" width="12" height="5" rx="2.5" className="fill-on-accent opacity-70" />
    </svg>
  );
}
