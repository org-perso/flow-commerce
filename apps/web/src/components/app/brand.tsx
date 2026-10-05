import { cn } from "@/lib/utils";

/** The app icon: a gold "F" whose top bar becomes a rising arrow, on navy. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      className={cn("size-8", className)}
      aria-hidden="true"
    >
      <rect width="1024" height="1024" rx="228" fill="#16325C" />
      <g
        transform="translate(512 512) scale(0.8) translate(-545 -500)"
        fill="none"
        stroke="#F2B544"
        strokeWidth="100"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M330 820V380H560L760 180" />
        <path d="M600 180H760V340" />
        <path d="M330 600H540" />
      </g>
    </svg>
  );
}

export function BrandName({ className }: { className?: string }) {
  return (
    <span className={cn("font-bold tracking-tight", className)}>Flow.Co</span>
  );
}
