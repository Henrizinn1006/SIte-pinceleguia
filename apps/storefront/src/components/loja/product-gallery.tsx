"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProductImageView } from "@vortexis/commerce/client";
import { cn } from "@vortexis/ui";

/**
 * Galeria da página de produto.
 *
 * Desktop: miniaturas verticais + imagem principal.
 * Mobile: carrossel com scroll-snap e indicadores (sem dependência
 * externa de carrossel — economiza bundle).
 */
export function ProductGallery({
  images,
  productName,
}: {
  images: ProductImageView[];
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex];

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg bg-warm-white text-ink-muted">
        Sem imagem disponível
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row-reverse lg:gap-5">
      {/* Imagem principal — desktop */}
      <div className="relative hidden aspect-square flex-1 overflow-hidden rounded-lg bg-warm-white shadow-soft lg:block">
        {active && (
          <Image
            src={active.url}
            alt={active.alt}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        )}
      </div>

      {/* Miniaturas — desktop */}
      {images.length > 1 && (
        <ul className="hidden shrink-0 flex-col gap-3 lg:flex" aria-label="Miniaturas">
          {images.map((image, index) => (
            <li key={image.url}>
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Ver imagem ${index + 1} de ${images.length}`}
                aria-current={index === activeIndex}
                className={cn(
                  "relative size-20 overflow-hidden rounded-sm bg-warm-white transition-all",
                  index === activeIndex
                    ? "ring-2 ring-caramel ring-offset-2 ring-offset-cream"
                    : "opacity-70 hover:opacity-100",
                )}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Carrossel — mobile */}
      <div className="lg:hidden">
        <ul
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
          aria-label={`Imagens de ${productName}`}
        >
          {images.map((image) => (
            <li
              key={image.url}
              className="relative aspect-square w-full shrink-0 snap-center overflow-hidden rounded-lg bg-warm-white shadow-soft"
            >
              <Image
                src={image.url}
                alt={image.alt}
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
            </li>
          ))}
        </ul>

        {images.length > 1 && (
          <p className="mt-2 text-center text-xs text-ink-muted">
            Deslize para ver as {images.length} imagens
          </p>
        )}
      </div>
    </div>
  );
}
