"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/** Photo picker: keeps the stored URL, or the picked file until the form uploads it. */
export function ImageField({
  url,
  file,
  onChange,
}: {
  url: string | null;
  file: File | null;
  onChange: (value: { url: string | null; file: File | null }) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URL lifecycle tied to the file
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const shown = file ? preview : url;

  return (
    <div className="flex items-center gap-4">
      <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-navy-soft text-navy">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt="Photo du produit"
            className="size-full object-cover"
          />
        ) : (
          <ImagePlus className="size-7" aria-hidden="true" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => input.current?.click()}
          >
            <ImagePlus /> {shown ? "Changer la photo" : "Ajouter une photo"}
          </Button>
          {shown && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange({ url: null, file: null })}
            >
              <Trash2 /> Retirer
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          JPG ou PNG. Réduite à 1024 px avant l’envoi.
        </p>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const picked = e.target.files?.[0];
          if (picked) onChange({ url, file: picked });
          e.target.value = "";
        }}
      />
    </div>
  );
}
