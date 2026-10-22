import { VehicleImage } from "./vehicle-image";

/**
 * Listing-detail gallery: large 16:9 image plus thumbnails. Every slot keeps its aspect ratio,
 * so the layout is identical before and after real photos are added.
 */
export function VehicleGallery({ title, imageUrls }: { title: string; imageUrls: string[] }) {
  const thumbs = Array.from({ length: 4 }, (_, i) => imageUrls[i + 1] ?? null);
  return (
    <div className="flex flex-col gap-3">
      <VehicleImage src={imageUrls[0]} alt={title} ratio="wide" priority sizes="(min-width: 1024px) 840px, 100vw" className="rounded-xl" />
      <ul className="grid grid-cols-4 gap-3" aria-label="More photos">
        {thumbs.map((src, i) => (
          <li key={i}>
            <VehicleImage src={src} alt={`${title}, photo ${i + 2}`} ratio="thumb" sizes="200px" className="rounded-lg" />
          </li>
        ))}
      </ul>
    </div>
  );
}
