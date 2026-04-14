"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { HotelImage } from "@/types";

export function HotelGallery({ images, title, compact = false }: { images: HotelImage[]; title: string; compact?: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const activeImage = images[activeIndex] ?? images[0];

  function goTo(index: number) {
    const safeIndex = (index + images.length) % images.length;
    setActiveIndex(safeIndex);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!lightboxOpen) return;
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowLeft") goTo(activeIndex - 1);
      if (event.key === "ArrowRight") goTo(activeIndex + 1);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [lightboxOpen]);

  if (!activeImage) return null;

  return (
    <>
    <div className="space-y-3">
      <div className={`relative overflow-hidden rounded-[28px] bg-slate-200 ${compact ? "h-56" : "h-[420px]"}`}>
        <button type="button" onClick={() => setLightboxOpen(true)} className="absolute inset-0 z-10 cursor-zoom-in" aria-label={`Open ${activeImage.label} image in lightbox`} />
        <Image src={activeImage.src} alt={activeImage.alt} fill className="object-cover" sizes={compact ? "(max-width: 1024px) 100vw, 50vw" : "(max-width: 1280px) 100vw, 70vw"} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
        <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4">
          <div>
            <div className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">{activeImage.label}</div>
            <h2 className="mt-3 max-w-xl text-2xl font-semibold text-white md:text-3xl">{title}</h2>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              className="rounded-full bg-white/90 p-3 text-slate-900 transition hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              className="rounded-full bg-white/90 p-3 text-slate-900 transition hover:bg-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {images.map((image, index) => (
          <button
            key={`${image.src}-${index}`}
            type="button"
            onClick={() => goTo(index)}
            className={`group relative overflow-hidden rounded-[20px] border transition ${
              index === activeIndex ? "border-expediaBlue ring-2 ring-expediaBlue/20" : "border-slate-200"
            }`}
          >
            <div className="relative h-20 bg-slate-200 md:h-24">
              <Image src={image.src} alt={image.alt} fill className="object-cover transition duration-300 group-hover:scale-105" sizes="20vw" />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/60 to-transparent px-2 py-2 text-left text-[11px] font-semibold text-white">
              {image.label}
            </div>
          </button>
        ))}
      </div>
    </div>
    {lightboxOpen ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/92 px-4 py-6">
        <button type="button" onClick={() => setLightboxOpen(false)} className="absolute inset-0 cursor-zoom-out" aria-label="Close lightbox" />
        <div className="relative z-10 flex w-full max-w-6xl flex-col gap-4">
          <div className="flex items-center justify-between text-white">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">{activeImage.label}</div>
              <div className="mt-2 text-xl font-semibold">{title}</div>
            </div>
            <div className="text-sm text-white/70">Use arrow keys to switch photos</div>
          </div>
          <div className="relative h-[72vh] overflow-hidden rounded-[28px] bg-slate-900">
            <Image src={activeImage.src} alt={activeImage.alt} fill className="object-contain" sizes="100vw" priority />
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-3 text-slate-900 transition hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-3 text-slate-900 transition hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {images.map((image, index) => (
              <button
                key={`lightbox-${image.src}-${index}`}
                type="button"
                onClick={() => goTo(index)}
                className={`group relative overflow-hidden rounded-[18px] border ${
                  index === activeIndex ? "border-white" : "border-white/20"
                }`}
              >
                <div className="relative h-20 bg-slate-800">
                  <Image src={image.src} alt={image.alt} fill className="object-cover transition duration-300 group-hover:scale-105" sizes="20vw" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}