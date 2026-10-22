"use client";

import type { OwnerVehicle } from "@car-rental/contracts";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { VehicleImage } from "@/domains/vehicles/components/vehicle-image";
import { errorMessage } from "@/shared/api/api-error";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { FormAlert } from "@/shared/components/ui/form-alert";
import { usePhotoMutations } from "../hooks";

const MAX_PHOTOS = 10;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

/** "Upload Photo" section of 38_Add listing: add, set cover, remove. The server re-validates every file. */
export function PhotoManager({ vehicle }: { vehicle: OwnerVehicle }) {
  const input = useRef<HTMLInputElement>(null);
  const { upload, remove, reorder } = usePhotoMutations(vehicle.id);
  const [problems, setProblems] = useState<string[]>([]);
  const [uploading, setUploading] = useState(0);
  const photos = vehicle.imageUrls;
  const busy = uploading > 0 || remove.isPending || reorder.isPending;

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const issues: string[] = [];
    const room = MAX_PHOTOS - photos.length;
    const chosen = [...files].slice(0, Math.max(room, 0));
    if (files.length > room) issues.push(`Only ${MAX_PHOTOS} photos are allowed; extra files were skipped.`);
    setUploading(chosen.length);
    for (const file of chosen) {
      if (!ACCEPTED.includes(file.type)) issues.push(`${file.name}: use JPEG, PNG or WebP.`);
      else if (file.size > MAX_BYTES) issues.push(`${file.name}: larger than 5 MB.`);
      else {
        try {
          await upload.mutateAsync(file);
        } catch (error) {
          issues.push(`${file.name}: ${errorMessage(error)}`);
        }
      }
      setUploading((n) => n - 1);
    }
    setProblems(issues);
    if (input.current) input.current.value = "";
  }

  const makeCover = (url: string) => reorder.mutate([url, ...photos.filter((p) => p !== url)]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border-strong px-6 py-8 text-center">
        <ImagePlus aria-hidden className="size-8 text-icon" />
        <Button type="button" onClick={() => input.current?.click()} disabled={busy || photos.length >= MAX_PHOTOS}>
          <ImagePlus aria-hidden />
          {uploading > 0 ? `Uploading ${uploading}…` : "Select photos"}
        </Button>
        <p className="text-xs">
          JPEG, PNG or WebP, up to 5 MB each · {photos.length}/{MAX_PHOTOS} photos · the first photo is the cover
        </p>
        <input
          ref={input}
          type="file"
          accept={ACCEPTED.join(",")}
          multiple
          className="sr-only"
          aria-label="Upload vehicle photos"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>
      {problems.length > 0 && (
        <FormAlert>
          <ul>
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </FormAlert>
      )}
      {(remove.isError || reorder.isError) && <FormAlert>{errorMessage(remove.error ?? reorder.error)}</FormAlert>}
      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5" aria-label="Vehicle photos">
          {photos.map((url, i) => (
            <li key={url} className="flex flex-col gap-2">
              <VehicleImage src={url} alt={`Photo ${i + 1}`} ratio="thumb" sizes="200px" className="rounded-lg">
                {i === 0 && <Badge className="absolute top-2 left-2">Cover</Badge>}
              </VehicleImage>
              <div className="flex items-center justify-between">
                {i > 0 ? (
                  <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => makeCover(url)}>
                    <Star aria-hidden /> Make cover
                  </Button>
                ) : (
                  <span />
                )}
                <Button type="button" variant="ghost" size="icon-sm" disabled={busy} aria-label={`Remove photo ${i + 1}`} onClick={() => remove.mutate(url)}>
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
