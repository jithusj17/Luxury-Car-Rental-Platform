import { CarFront } from "lucide-react";
import Image from "next/image";
import { cn } from "@/shared/lib/utils";

/**
 * Fixed aspect ratios, so layouts don't shift when real photos arrive.
 * card 4:3 (Card medium 300×225), wide 16:9 (detail gallery), thumb 3:2 (list rows).
 */
const ratios = {
  card: "aspect-[4/3]",
  wide: "aspect-video",
  thumb: "aspect-[3/2]",
  square: "aspect-square",
} as const;

type VehicleImageProps = {
  /** Image URL from vehicle data. Remote hosts must be allowed in next.config `images.remotePatterns`. */
  src: string | null | undefined;
  alt: string;
  ratio?: keyof typeof ratios;
  /** Passed to next/image so the browser picks the right size. */
  sizes?: string;
  /** Above-the-fold image: load eagerly with high priority. */
  priority?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export function VehicleImage({
  src,
  alt,
  ratio = "card",
  sizes = "(min-width: 1024px) 300px, 100vw",
  priority,
  className,
  children,
}: VehicleImageProps) {
  return (
    <div className={cn("relative overflow-hidden bg-placeholder", ratios[ratio], className)}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          className="object-cover"
        />
      ) : (
        <div role="img" aria-label={alt} className="flex size-full items-center justify-center">
          <CarFront aria-hidden className="size-1/4 max-h-16 max-w-16 text-white" strokeWidth={1.25} />
        </div>
      )}
      {children}
    </div>
  );
}
