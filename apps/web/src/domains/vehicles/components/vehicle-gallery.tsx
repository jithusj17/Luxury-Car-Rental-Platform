import { VehicleImage } from "./vehicle-image";

/**
 * Listing-detail gallery: large 16:9 image (a placeholder when there are no photos) plus up to
 * four thumbnails, shown only for photos that exist. Every slot keeps its aspect ratio.
 */
export function VehicleGallery({ title, imageUrls }: { title: string; imageUrls: string[] }) {
  const thumbs = imageUrls.slice(1, 5);
  return (
    <div className="flex flex-col gap-3">
      <VehicleImage src={imageUrls[0]} alt={title} ratio="wide" priority sizes="(min-width: 1024px) 840px, 100vw" className="rounded-xl" />
      {thumbs.length > 0 && (
        <ul className="grid grid-cols-4 gap-3" aria-label="More photos">
          {thumbs.map((src, i) => (
            <li key={src}>
              <VehicleImage src={src} alt={`${title}, photo ${i + 2}`} ratio="thumb" sizes="200px" className="rounded-lg" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
