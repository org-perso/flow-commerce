import Image from "next/image";

/** A phone frame around a real app screenshot (default size: 1170×2532). */
export function PhoneFrame({
  src,
  alt,
  className = "w-[270px]",
  priority,
  width = 1170,
  height = 2532,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  width?: number;
  height?: number;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[2.4rem] border-[10px] border-navy bg-navy shadow-2xl shadow-navy/30 ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        sizes="300px"
        className="block h-auto w-full rounded-[1.7rem]"
      />
    </div>
  );
}
