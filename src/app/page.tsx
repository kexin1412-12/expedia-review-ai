"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Heart,
  Sparkles,
  Star,
} from "lucide-react";
import { HotelRecord } from "@/types";
import { getHotelImage } from "@/lib/hotel-display";

function currencyFromRating(rating: number | null) {
  const base = Math.max(110, Math.round((rating ?? 8) * 28));
  return {
    nightly: base,
    oldNightly: base + 36,
    total: base * 2 + 84,
    oldTotal: base * 2 + 152,
  };
}

function hotelSubtitle(hotel: HotelRecord) {
  return [hotel.city, hotel.province, hotel.country].filter(Boolean).join(", ");
}

function initials(hotel: HotelRecord) {
  return `${hotel.city?.[0] ?? "H"}${hotel.country?.[0] ?? "T"}`;
}

function hotelGradient(index: number) {
  const gradients = [
    "from-sky-500 via-cyan-400 to-blue-600",
    "from-amber-400 via-orange-400 to-pink-500",
    "from-emerald-400 via-teal-400 to-cyan-500",
    "from-violet-500 via-fuchsia-400 to-rose-400",
    "from-blue-700 via-indigo-600 to-sky-500",
  ];
  return gradients[index % gradients.length];
}

export default function HomePage() {
  const router = useRouter();
  const [hotels, setHotels] = useState<HotelRecord[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadHotels() {
      const response = await fetch("/api/hotels");
      const json = await response.json();
      setHotels(json.hotels ?? []);
    }
    void loadHotels();
  }, []);

  function toggleFavorite(id: string) {
    setFavoriteIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <main className="min-h-screen bg-expediaBg text-slate-900">
      <section className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto max-w-[1480px] px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-[#0a438b] px-4 py-2 text-lg font-bold text-white">expedia</div>
              <div className="hidden text-sm text-slate-500 md:block">Hotels • Reviews • Smart follow-up</div>
            </div>
            <div className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-expediaBlue">
              Adaptive Review Prompting
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200/60 bg-expediaBg px-6 py-16 text-center">
        <div className="mx-auto max-w-5xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-5 py-2 text-sm font-semibold tracking-[0.14em] text-expediaBlue">
            <Sparkles className="h-4 w-4" />
            AI-ASSISTED REVIEW FLOW
          </div>
          <h1 className="mt-7 text-5xl font-bold tracking-tight text-[#0b1638] md:text-6xl">
            Write your Expedia-style review,
            <br />
            then let one smart follow-up do the rest.
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-xl leading-9 text-slate-600">
            Browse properties, open one hotel, read guest comments, and leave your own review with a low-friction AI follow-up.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1480px] px-6 py-10">
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-[#0b1638]">Explore hotels</h2>
              <p className="mt-1 text-slate-600">Pick a property to open its guest reviews and write your own.</p>
            </div>
            <button className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-expediaBlue shadow-sm">
              See all properties
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-4">
            {hotels.slice(0, 8).map((hotel, index) => {
              const pricing = currencyFromRating(hotel.rating);

              return (
                <button
                  key={hotel.id}
                  type="button"
                  onClick={() => router.push(`/hotels/${hotel.id}`)}
                  className="overflow-hidden rounded-[28px] border border-slate-200 bg-white text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className={`relative h-52 bg-gradient-to-br ${hotelGradient(index)} p-4 text-white`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={getHotelImage(hotel)} alt={hotel.name} className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-black/10" />
                    <div className="absolute left-4 top-4 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold">VIP Access</div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(hotel.id);
                      }}
                      className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-slate-800"
                    >
                      <Heart className={`h-4 w-4 ${favoriteIds.includes(hotel.id) ? "fill-red-500 text-red-500" : ""}`} />
                    </button>
                    <div className="absolute inset-x-4 bottom-4 flex items-end justify-between">
                      <button type="button" className="rounded-full bg-white/25 p-2 backdrop-blur">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <div className="text-right">
                        <div className="text-4xl font-bold">{initials(hotel)}</div>
                        <div className="text-xs opacity-90">Preview image</div>
                      </div>
                      <button type="button" className="rounded-full bg-white/25 p-2 backdrop-blur">
                        <ChevronRight className="h-4 w-4" />
                      </button>
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
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
