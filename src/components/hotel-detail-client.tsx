"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, MapPin, Star, Clock, Globe,
  ChevronDown, ChevronRight, ShieldCheck, PawPrint, Baby, AlertTriangle,
  Trophy, ThumbsUp, Coffee, Compass, Wifi, Car, Utensils, Dumbbell, Snowflake, Bus,
} from "lucide-react";
import { HotelRecord, ReviewRecord, AmenityCategories } from "@/types";
import { getHotelImage, getHotelGallery, hotelSubtitle, ratingLabel } from "@/lib/hotel-display";
import { SiteHeader } from "@/components/site-header";
import { KnowledgeHealthPanel } from "@/components/knowledge-health-panel";
import { ReviewIntelligenceModal, ReviewIntelligencePanel } from "@/components/review-intelligence-modal";



/* ── Amenity category UI config ── */
const AMENITY_CATEGORY_LABELS: Record<keyof AmenityCategories, string> = {
  accessibility: "Accessibility",
  activitiesNearby: "Nearby Activities",
  businessServices: "Business Services",
  conveniences: "Conveniences",
  familyFriendly: "Family Friendly",
  foodAndDrink: "Food & Drink",
  guestServices: "Guest Services",
  internet: "Internet",
  langsSpoken: "Languages Spoken",
  more: "More Amenities",
  outdoor: "Outdoor",
  parking: "Parking",
  spa: "Spa & Wellness",
  thingsToDo: "Things to Do",
};

const CATEGORY_ICONS: Record<keyof AmenityCategories, string> = {
  accessibility: "\u267F",
  activitiesNearby: "\uD83C\uDFAF",
  businessServices: "\uD83D\uDCBC",
  conveniences: "\uD83D\uDD27",
  familyFriendly: "\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67",
  foodAndDrink: "\uD83C\uDF7D\uFE0F",
  guestServices: "\uD83D\uDECE\uFE0F",
  internet: "\uD83D\uDCF6",
  langsSpoken: "\uD83D\uDDE3\uFE0F",
  more: "\u2795",
  outdoor: "\uD83C\uDF3F",
  parking: "\uD83C\uDD7F\uFE0F",
  spa: "\uD83D\uDC86",
  thingsToDo: "\uD83C\uDF89",
};

/* ── Popular amenity → Lucide icon mapping ── */
const POPULAR_AMENITY_ICONS: Record<string, React.ReactNode> = {
  "Breakfast Included": <Coffee className="h-5 w-5" />,
  "Breakfast Available": <Coffee className="h-5 w-5" />,
  "Internet": <Wifi className="h-5 w-5" />,
  "Free Parking": <Car className="h-5 w-5" />,
  "Restaurant": <Utensils className="h-5 w-5" />,
  "Pool": <Compass className="h-5 w-5" />,
  "Fitness Equipment": <Dumbbell className="h-5 w-5" />,
  "Ac": <Snowflake className="h-5 w-5" />,
  "Spa": <Compass className="h-5 w-5" />,
  "Bar": <Coffee className="h-5 w-5" />,
  "Laundry": <Compass className="h-5 w-5" />,
  "Frontdesk 24 Hour": <Clock className="h-5 w-5" />,
  "No Smoking": <ShieldCheck className="h-5 w-5" />,
  "Housekeeping": <ShieldCheck className="h-5 w-5" />,
  "Outdoor Space": <Globe className="h-5 w-5" />,
  "Tv": <Compass className="h-5 w-5" />,
  "Airport Shuttle": <Bus className="h-5 w-5" />,
};

function getPopularIcon(amenity: string) {
  return POPULAR_AMENITY_ICONS[amenity] ?? <Compass className="h-5 w-5" />;
}

/* ── Generate highlights from hotel data ── */
function generateHighlights(hotel: HotelRecord, reviewCount: number) {
  const highlights: { icon: React.ReactNode; title: string; description: string }[] = [];

  if (hotel.rating && hotel.rating >= 8.5) {
    highlights.push({
      icon: <Trophy className="h-6 w-6 text-expediaBlue" />,
      title: "Highly rated",
      description: `Guests love this property -- rated ${hotel.rating.toFixed(1)} based on ${reviewCount} reviews.`,
    });
  }

  const food = hotel.amenityCategories?.foodAndDrink ?? [];
  const hasBreakfast = food.some(f => /breakfast/i.test(f));
  if (hasBreakfast) {
    const freeBreakfast = food.some(f => /free.*breakfast/i.test(f));
    highlights.push({
      icon: <Coffee className="h-6 w-6 text-expediaBlue" />,
      title: freeBreakfast ? "Free breakfast" : "Breakfast available",
      description: freeBreakfast
        ? "Start your morning with a complimentary breakfast."
        : "Breakfast is available on-site for guests.",
    });
  }

  const parking = hotel.amenityCategories?.parking ?? [];
  if (parking.length > 0) {
    const freeParking = parking.some(p => /free.*parking|free.*self/i.test(p));
    if (freeParking) {
      highlights.push({
        icon: <Car className="h-6 w-6 text-expediaBlue" />,
        title: "Free parking",
        description: "Self-parking is included at no extra charge.",
      });
    }
  }

  highlights.push({
    icon: <ThumbsUp className="h-6 w-6 text-expediaBlue" />,
    title: "Easy to get around",
    description: "Guests love the convenient spot for exploring the area.",
  });

  return highlights.slice(0, 4);
}

/* ── Amenity category card (redesigned) ── */

/** Split items into short "chip" labels vs longer descriptive details */
function splitAmenityItems(items: string[]): { chips: string[]; details: string[] } {
  const chips: string[] = [];
  const details: string[] = [];
  for (const item of items) {
    const cleaned = item.replace(/\\n/g, "").trim();
    if (!cleaned) continue;
    // Short items (≤5 words and ≤40 chars) → chip; longer → detail
    const wordCount = cleaned.split(/\s+/).length;
    if (wordCount <= 5 && cleaned.length <= 40) {
      chips.push(cleaned);
    } else {
      details.push(cleaned);
    }
  }
  return { chips, details };
}

/** Derive a simple AI validation status from item count */
function amenityAiStatus(count: number): { label: string; color: string } {
  if (count >= 8) return { label: "Well Covered", color: "bg-emerald-50 text-emerald-700" };
  if (count >= 4) return { label: "Moderate", color: "bg-blue-50 text-expediaBlue" };
  if (count >= 1) return { label: "Limited", color: "bg-amber-50 text-amber-700" };
  return { label: "No Data", color: "bg-slate-50 text-slate-400" };
}

/** Priority order for default-expanded categories */
const CATEGORY_PRIORITY: (keyof AmenityCategories)[] = [
  "accessibility", "familyFriendly", "foodAndDrink", "spa", "guestServices",
  "conveniences", "internet", "parking", "outdoor", "thingsToDo",
  "activitiesNearby", "businessServices", "langsSpoken", "more",
];

function AmenityCategoryCard({ catKey, title, icon, items, isExpanded, onToggle }: {
  catKey: string; title: string; icon: string; items: string[];
  isExpanded: boolean; onToggle: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const { chips, details } = useMemo(() => splitAmenityItems(items), [items]);
  const status = amenityAiStatus(items.length);
  const featuredChips = chips.slice(0, 5);
  const extraChips = chips.slice(5);
  const [showAllChips, setShowAllChips] = useState(false);

  if (items.length === 0) return null;

  /* ── Collapsed: compact row ── */
  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2.5 rounded-xl border border-transparent bg-slate-50/70 px-4 py-3 text-left transition hover:border-slate-200 hover:bg-white hover:shadow-sm"
      >
        <span className="text-base">{icon}</span>
        <span className="text-[13px] font-semibold text-slate-700">{title}</span>
        <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{items.length}</span>
        <ChevronRight className="ml-auto h-3.5 w-3.5 text-slate-400" />
      </button>
    );
  }

  /* ── Expanded: full card ── */
  return (
    <div className="col-span-full rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-bold text-slate-800">{title}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{items.length}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.color}`}>{status.label}</span>
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {/* Body */}
      <div className="px-5 pb-4">
        {/* Key chips */}
        {featuredChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {featuredChips.map((chip, i) => (
              <span key={i} className="rounded-full border border-blue-100 bg-blue-50/60 px-2.5 py-1 text-[12px] font-medium text-blue-700">{chip}</span>
            ))}
            {showAllChips && extraChips.map((chip, i) => (
              <span key={`extra-${i}`} className="rounded-full border border-slate-150 bg-slate-50 px-2.5 py-1 text-[12px] font-medium text-slate-600">{chip}</span>
            ))}
            {extraChips.length > 0 && !showAllChips && (
              <button type="button" onClick={() => setShowAllChips(true)} className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-[12px] font-medium text-expediaBlue hover:border-expediaBlue">+{extraChips.length} more</button>
            )}
          </div>
        )}
        {/* Detail items */}
        {details.length > 0 && (
          <div className={featuredChips.length > 0 ? "mt-2.5" : ""}>
            <button type="button" onClick={() => setShowDetails(!showDetails)} className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-expediaBlue">
              <ChevronRight className={`h-3 w-3 transition-transform ${showDetails ? "rotate-90" : ""}`} />
              {showDetails ? "Hide details" : `${details.length} detail${details.length > 1 ? "s" : ""}`}
            </button>
            {showDetails && (
              <ul className="mt-2 columns-2 gap-x-8 space-y-1.5 pl-0.5">
                {details.map((d, i) => (
                  <li key={i} className="flex items-start gap-1.5 break-inside-avoid text-[13px] text-slate-600">
                    <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-slate-300" />{d}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AmenitiesByCategorySection({ hotel }: { hotel: HotelRecord }) {
  // Sort categories by priority, filter empty ones
  const sortedCategories = useMemo(() => {
    return CATEGORY_PRIORITY
      .filter((key) => (hotel.amenityCategories[key] ?? []).length > 0)
      .map((key) => ({
        key,
        title: AMENITY_CATEGORY_LABELS[key],
        icon: CATEGORY_ICONS[key],
        items: hotel.amenityCategories[key],
      }));
  }, [hotel.amenityCategories]);

  // Default: expand first 2 categories
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    sortedCategories.slice(0, 2).forEach((c) => initial.add(c.key));
    return initial;
  });

  function toggleCategory(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (sortedCategories.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="rounded-[22px] border border-slate-200 bg-white p-7 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Amenities by Category</h2>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Coverage from listing data
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-1.5 lg:grid-cols-3">
          {sortedCategories.map((cat) => (
            <AmenityCategoryCard
              key={cat.key}
              catKey={cat.key}
              title={cat.title}
              icon={cat.icon}
              items={cat.items}
              isExpanded={expanded.has(cat.key)}
              onToggle={() => toggleCategory(cat.key)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Policy card ── */
function PolicyCard({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  if (items.length === 0) return null;
  function cleanHtml(text: string) { return text.replace(/<\/?[^>]+(>|$)/g, "").trim(); }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">{icon}{title}</div>
      <ul className="mt-3 space-y-2">
        {items.map((item, i) => {
          const cleaned = cleanHtml(item);
          if (!cleaned) return null;
          return (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="mt-0.5 text-slate-300">{"\u2022"}</span><span>{cleaned}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function HotelDetailClient({ hotel }: { hotel: HotelRecord }) {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [showIntelModal, setShowIntelModal] = useState(false);

  useEffect(() => {
    async function loadHotelContext() {
      const reviewsRes = await fetch(`/api/hotels/${hotel.id}/reviews`);
      const reviewsJson = await reviewsRes.json();
      setReviews(reviewsJson.reviews ?? []);
    }

    void loadHotelContext();
  }, [hotel.id]);

  const highlights = useMemo(() => generateHighlights(hotel, reviews.length || hotel.reviewCount), [hotel, reviews.length]);
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  return (
    <main className="min-h-screen bg-expediaBg text-slate-900">
      <SiteHeader />

      <div className="mx-auto max-w-[1480px] px-6 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-expediaBlue hover:text-expediaBlue"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to hotels
        </Link>

        {/* ═══════ Image Gallery ═══════ */}
        <section className="mt-6">
          <div className="grid grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-[26px]" style={{ height: 400 }}>
            <div className="relative col-span-2 row-span-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getHotelImage(hotel)} alt={hotel.name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-5 left-5">
                {hotel.starRating && (
                  <div className="mb-2 flex items-center gap-0.5">
                    {Array.from({ length: Math.round(hotel.starRating) }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                    <span className="ml-1.5 text-sm font-semibold text-white/90">{hotel.starRating}-star hotel</span>
                  </div>
                )}
                <h1 className="text-3xl font-bold text-white drop-shadow-lg">{hotel.name}</h1>
                <div className="mt-1.5 flex items-center gap-1.5 text-white/90">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="text-sm">{hotelSubtitle(hotel)}</span>
                </div>
              </div>
            </div>
            {getHotelGallery(hotel).map((src, i) => (
              <div key={i} className="relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`${hotel.name} photo ${i + 2}`} className="h-full w-full object-cover transition hover:scale-105" />
              </div>
            ))}
          </div>
        </section>

        {/* ═══════ Rating + Highlights / Explore the Area ═══════ */}
        <section className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left: Rating + Highlights */}
          <div>
            {/* Rating badge (Expedia style) */}
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700">
                <span className="text-lg font-bold text-white">{(hotel.rating ?? 8).toFixed(1)}</span>
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">{ratingLabel(hotel.rating)}</div>
                <button
                  onClick={() => setShowIntelModal(true)}
                  className="mt-0.5 flex items-center gap-1 text-sm font-semibold text-expediaBlue hover:underline"
                >
                  See all {hotel.reviewCount} reviews <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Highlights */}
            <div className="mt-8">
              <h2 className="text-xl font-bold text-slate-900">Highlights for your trip</h2>
              <div className="mt-5 space-y-5">
                {highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-50">
                      {h.icon}
                    </div>
                    <div>
                      <div className="text-[15px] font-bold text-slate-900">{h.title}</div>
                      <div className="mt-0.5 text-sm text-slate-500">{h.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Explore the area */}
          <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-card">
            <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Globe className="h-5 w-5 text-expediaBlue" />
              Explore the area
            </div>
            {hotel.areaDescription && (
              <p className="mt-3 text-sm leading-6 text-slate-500">{hotel.areaDescription}</p>
            )}
            {/* Nearby activities from amenityCategories */}
            {hotel.amenityCategories.activitiesNearby.length > 0 && (
              <div className="mt-5 space-y-3">
                {hotel.amenityCategories.activitiesNearby.slice(0, 5).map((activity, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-expediaBlue" />
                      <span className="text-sm text-slate-700">{activity}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {hotel.amenityCategories.thingsToDo.length > 0 && (
              <div className="mt-4 space-y-3">
                {hotel.amenityCategories.thingsToDo.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-expediaBlue" />
                    <span className="text-sm text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ═══════ About this Property (2-col icon grid) ═══════ */}
        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900">About this property</h2>

          {/* Popular amenities as 2-col icon grid (Expedia style) */}
          <div className="mt-5 grid grid-cols-2 gap-x-12 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
            {hotel.popularAmenities.slice(0, showAllAmenities ? undefined : 6).map((amenity) => (
              <div key={amenity} className="flex items-center gap-3">
                <span className="text-slate-600">{getPopularIcon(amenity)}</span>
                <span className="text-sm text-slate-700">{amenity}</span>
              </div>
            ))}
          </div>
          {hotel.popularAmenities.length > 6 && !showAllAmenities && (
            <button
              onClick={() => setShowAllAmenities(true)}
              className="mt-4 flex items-center gap-1 text-sm font-semibold text-expediaBlue hover:underline"
            >
              See all about this property <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Property description */}
          <p className="mt-5 text-[15px] leading-7 text-slate-600">{hotel.description}</p>
        </section>

        {/* ═══════ Check-in/out + Policies ═══════ */}
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Check-in & Check-out */}
          <div className="rounded-[22px] border border-slate-200 bg-white p-7 shadow-card">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Clock className="h-5 w-5 text-expediaBlue" />
              Check-in & Check-out
            </h2>
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {hotel.checkIn.startTime && (
                  <div className="rounded-xl bg-blue-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">Check-in window</div>
                    <div className="mt-1.5 text-lg font-bold text-slate-800">
                      {hotel.checkIn.startTime}{hotel.checkIn.endTime ? ` - ${hotel.checkIn.endTime}` : ""}
                    </div>
                  </div>
                )}
                {hotel.checkOut.time && (
                  <div className="rounded-xl bg-amber-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-amber-600">Check-out</div>
                    <div className="mt-1.5 text-lg font-bold text-slate-800">{hotel.checkOut.time}</div>
                  </div>
                )}
              </div>
              {hotel.checkIn.instructions.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-slate-700">Instructions</div>
                  <ul className="mt-2 space-y-1.5">
                    {hotel.checkIn.instructions.map((inst, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="mt-0.5 text-slate-300">{"\u2022"}</span><span>{inst}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {hotel.checkOut.policy.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-slate-700">Check-out policy</div>
                  <ul className="mt-2 space-y-1.5">
                    {hotel.checkOut.policy.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="mt-0.5 text-slate-300">{"\u2022"}</span><span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Policies */}
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <ShieldCheck className="h-5 w-5 text-expediaBlue" />
              Policies
            </h2>
            <PolicyCard icon={<PawPrint className="h-4 w-4 text-slate-500" />} title="Pet Policy" items={hotel.policies.pet} />
            <PolicyCard icon={<Baby className="h-4 w-4 text-slate-500" />} title="Children & Extra Bed Policy" items={hotel.policies.childrenAndExtraBed} />
            <PolicyCard icon={<AlertTriangle className="h-4 w-4 text-slate-500" />} title="Know Before You Go" items={hotel.policies.knowBeforeYouGo} />
          </div>
        </section>

        {/* ═══════ Property Knowledge Health ═══════ */}
        <section className="mt-8">
          <KnowledgeHealthPanel hotelId={hotel.id} />
        </section>

        {/* ═══════ Review Intelligence Panel ═══════ */}
        <section className="mt-10">
          <ReviewIntelligencePanel hotel={hotel} reviews={reviews} />
        </section>
      </div>
      {/* ═══════ Review Intelligence Modal ═══════ */}
      {showIntelModal && (
        <ReviewIntelligenceModal
          hotel={hotel}
          reviews={reviews}
          onClose={() => setShowIntelModal(false)}
        />
      )}
    </main>
  );
}
