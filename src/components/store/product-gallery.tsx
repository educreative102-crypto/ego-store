"use client";

import { useState } from "react";
import { StoreImage } from "@/components/store/store-image";

export function ProductGallery({ images, name, sku }: { images: string[]; name: string; sku: string }) {
  const [active, setActive] = useState(0);
  const current = images.length > 0 ? images[Math.min(active, images.length - 1)] : null;

  if (!current) {
    return (
      <div className="grid aspect-square w-full place-items-center rounded-2xl bg-zinc-100 text-5xl font-black text-zinc-300">
        {sku}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-100">
        <StoreImage
          src={current}
          alt={name}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 ? (
        <div className="grid grid-cols-4 gap-2">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              title={`عرض الصورة ${i + 1}`}
              onClick={() => setActive(i)}
              aria-pressed={i === active}
              className={`relative aspect-square overflow-hidden rounded-xl transition-all ${
                i === active ? "ring-2 ring-primary ring-offset-2" : "opacity-70 hover:opacity-100"
              }`}
            >
              <StoreImage
                src={src}
                alt=""
                fill
                sizes="96px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}