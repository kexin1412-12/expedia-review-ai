import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Heart } from "lucide-react";
import { HotelRecord } from "@/types";
import { currencyFromRating, getHotelGallery, hotelSubtitle } from "@/lib/hotel-display";

export function HotelCard({ hotel, index }: { hotel: HotelRecord; index: number }) {
  const pricing = currencyFromRating(hotel.rating);
  const previewImage = getHotelGallery(hotel)[0];

  return (
    <Link
      href={`/hotels/${hotel.id}`}
      className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative h-52 bg-slate-200 p-4 text-white">
        {previewImage ? (
          <>
            <Image src={previewImage.src} alt={previewImage.alt} fill className="object-cover transition duration-500 group-hover:scale-105" sizes="(max-width: 1024px) 100vw, 25vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/10 to-transparent" />
          </>
        ) : null}
        <div className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-slate-800 transition group-hover:scale-105">
          <Heart className="h-4 w-4" />
        </div>
        <div className="absolute inset-x-4 bottom-4 flex items-end justify-between">
          <div className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">Open reviews</div>
          <div className="text-right">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white/85">{previewImage?.label ?? "Preview"}</div>
            <div className="mt-1 text-xs opacity-90">Review hub</div>
          </div>
        </div>
      </div>

      <div className="p-5">
        <h3 className="line-clamp-2 text-xl font-semibold text-slate-900">{hotel.name}</h3>
        <p className="mt-1 text-sm text-slate-500">{hotelSubtitle(hotel)}</p>

        <div className="mt-4 flex items-center gap-2">
          <span className="rounded-md bg-emerald-700 px-2.5 py-1 text-sm font-bold text-white">
            {(hotel.rating ?? 8.0).toFixed(1)}
          </span>
          <span className="text-sm text-slate-700">Wonderful ({hotel.reviewCount} reviews)</span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            ${pricing.oldNightly - pricing.nightly} off
          </span>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-expediaBlue">
            Member Price available
          </span>
        </div>

        <div className="mt-4 text-sm text-slate-500">from</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-slate-900">${pricing.nightly}</span>
          <span className="text-sm text-slate-500 line-through">${pricing.oldNightly}</span>
        </div>
        <div className="mt-1 text-sm text-slate-500">${pricing.total} total</div>
        <div className="mt-1 text-xs text-slate-500 line-through">${pricing.oldTotal} total</div>
        <div className="mt-2 flex items-center gap-1 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Total with taxes and fees
        </div>
      </div>
    </Link>
  );
}