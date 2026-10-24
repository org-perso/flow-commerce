import { Package } from "lucide-react";

import { sizedImage } from "@/lib/product-image";
import { cn } from "@/lib/utils";

/** Product photo (Cloudinary, or Firebase for older photos) or a neutral placeholder. */
export function ProductThumb({
  src,
  name,
  className,
}: {
  src: string | null;
  name: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-navy-soft text-navy",
        className,
      )}
    >
      {src ? (
        // Remote Storage URLs with tokens: a plain img avoids configuring next/image domains.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sizedImage(src, 96)}
          alt={name}
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        <Package className="size-1/2" aria-hidden="true" />
      )}
    </span>
  );
}
