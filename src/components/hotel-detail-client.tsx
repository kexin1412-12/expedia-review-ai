"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MapPin, Mic, Send, Sparkles, Star, Clock, Globe, ChevronDown, ShieldCheck, PawPrint, Baby, AlertTriangle } from "lucide-react";
import { FollowUpResponse, HotelRecord, ReviewRecord, AmenityCategories } from "@/types";
import { getHotelImage, getHotelGallery, hotelSubtitle, getAmenityIcon, ratingLabel } from "@/lib/hotel-display";
import { ReviewCard } from "@/components/review-card";
import { SiteHeader } from "@/components/site-header";
import { KnowledgeHealthPanel } from "@/components/knowledge-health-panel";

const fallbackReview = "The room was very clean and the staff were friendly. Check-in was smooth.";

/* ── Amenity category UI labels ── */
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
  accessibility: "♿",
  activitiesNearby: "🎯",
  businessServices: "💼",
  conveniences: "🔧",
  familyFriendly: "👨‍👩‍👧",
  foodAndDrink: "🍽️",
  guestServices: "🛎️",
  internet: "📶",
  langsSpoken: "🗣️",
  more: "➕",
  outdoor: "🌿",
  parking: "🅿️",
  spa: "💆",
  thingsToDo: "🎉",
};

/* ── Accordion section component ── */
function AccordionSection({ title, icon, items }: { title: string; icon: string; items: string[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-3.5 text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-semibold text-slate-800">{title}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{items.length}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="pb-4 pl-9">
          <div className="flex flex-wrap gap-2">
            {items.map((item, i) => (
              <span key={i} className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-600">{item}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Policy card component ── */
function PolicyCard({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  if (items.length === 0) return null;

  function cleanHtml(text: string) {
    return text.replace(/<\/?[^>]+(>|$)/g, "").trim();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        {icon}
        {title}
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((item, i) => {
          const cleaned = cleanHtml(item);
          if (!cleaned) return null;
          return (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="mt-0.5 text-slate-300">•</span>
              <span>{cleaned}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function HotelDetailClient({ hotel }: { hotel: HotelRecord }) {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [draftReview, setDraftReview] = useState(fallbackReview);
  const [followUp, setFollowUp] = useState<FollowUpResponse | null>(null);
  const [selectedReply, setSelectedReply] = useState("");
  const [extraDetails, setExtraDetails] = useState("");
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "captured">("idle");
  const [voiceText, setVoiceText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadHotelContext() {
      const reviewsRes = await fetch(`/api/hotels/${hotel.id}/reviews`);
      const reviewsJson = await reviewsRes.json();
      setReviews(reviewsJson.reviews ?? []);
      setSelectedReply("");
      setExtraDetails("");
      setVoiceText("");
      setVoiceState("idle");
    }

    void loadHotelContext();
  }, [hotel.id]);

  useEffect(() => {
    if (!hotel.id || !draftReview.trim()) return;

    const timer = setTimeout(async () => {
      const response = await fetch(`/api/hotels/${hotel.id}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftReview }),
      });
      const json = await response.json();
      setFollowUp(json);
    }, 450);

    return () => clearTimeout(timer);
  }, [hotel.id, draftReview]);

  const finalFollowUpText = useMemo(
    () => [selectedReply, extraDetails.trim(), voiceText.trim()].filter(Boolean).join(". "),
    [selectedReply, extraDetails, voiceText],
  );

  async function submitReview() {
    if (!draftReview.trim()) return;
    setSubmitting(true);

    const combined = [draftReview.trim(), finalFollowUpText.trim()].filter(Boolean).join("\n\nFollow-up: ");

    await fetch(`/api/hotels/${hotel.id}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: combined }),
    });

    const reviewsRes = await fetch(`/api/hotels/${hotel.id}/reviews`);
    const reviewsJson = await reviewsRes.json();
    setReviews(reviewsJson.reviews ?? []);
    setDraftReview("");
    setSelectedReply("");
    setExtraDetails("");
    setVoiceText("");
    setVoiceState("idle");
    setSubmitting(false);
  }

  function mockVoice() {
    if (voiceState === "listening") return;
    setVoiceState("listening");
    setTimeout(() => {
      setVoiceText("It was pretty good, but there were not many options.");
      setVoiceState("captured");
    }, 1200);
  }

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

        {/* ═══════════ SECTION 1: Property Overview (Hero) ═══════════ */}
        <section className="mt-6">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            {/* Left: Image gallery */}
            <div className="space-y-6">
              <div className="grid grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-[26px]" style={{ height: 380 }}>
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

              {/* Quick stats bar */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5">
                  <span className="text-xl font-bold text-white">{(hotel.rating ?? 8).toFixed(1)}</span>
                  <div className="border-l border-white/30 pl-2">
                    <div className="text-sm font-semibold text-white">{ratingLabel(hotel.rating)}</div>
                    <div className="text-[11px] text-emerald-100">{hotel.reviewCount} reviews</div>
                  </div>
                </div>
                {hotel.popularAmenities.slice(0, 6).map((amenity) => (
                  <span key={amenity} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm">
                    <span className="text-base">{getAmenityIcon(amenity)}</span>
                    {amenity}
                  </span>
                ))}
                {hotel.popularAmenities.length > 6 && (
                  <span className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-expediaBlue shadow-sm">
                    +{hotel.popularAmenities.length - 6} more
                  </span>
                )}
              </div>
            </div>

            {/* Right: About this property */}
            <div className="rounded-[26px] border border-slate-200 bg-white p-7 shadow-card">
              <h2 className="text-xl font-bold text-[#0b1638]">About this property</h2>
              <p className="mt-4 text-[15px] leading-7 text-slate-600">{hotel.description}</p>

              {hotel.areaDescription && (
                <div className="mt-6 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-expediaBlue">
                    <Globe className="h-4 w-4" />
                    Explore the area
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{hotel.areaDescription}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ═══════════ SECTION 2: Popular Amenities ═══════════ */}
        {hotel.popularAmenities.length > 0 && (
          <section className="mt-8">
            <div className="rounded-[26px] border border-slate-200 bg-white p-7 shadow-card">
              <h2 className="text-xl font-bold text-[#0b1638]">Popular Amenities</h2>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {hotel.popularAmenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700"
                  >
                    <span className="text-lg">{getAmenityIcon(amenity)}</span>
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ═══════════ SECTION 3: Amenities by Category (Accordion) ═══════════ */}
        <section className="mt-6">
          <div className="rounded-[26px] border border-slate-200 bg-white p-7 shadow-card">
            <h2 className="text-xl font-bold text-[#0b1638]">Amenities by Category</h2>
            <div className="mt-4">
              {(Object.entries(hotel.amenityCategories) as [keyof AmenityCategories, string[]][]).map(([key, items]) => (
                <AccordionSection
                  key={key}
                  title={AMENITY_CATEGORY_LABELS[key]}
                  icon={CATEGORY_ICONS[key]}
                  items={items}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ SECTION 4 & 5: Check-in/out + Policies (side by side) ═══════════ */}
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Check-in & Check-out */}
          <div className="rounded-[26px] border border-slate-200 bg-white p-7 shadow-card">
            <h2 className="flex items-center gap-2 text-xl font-bold text-[#0b1638]">
              <Clock className="h-5 w-5 text-expediaBlue" />
              Check-in & Check-out
            </h2>
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {hotel.checkIn.startTime && (
                  <div className="rounded-xl bg-blue-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">Check-in window</div>
                    <div className="mt-1.5 text-lg font-bold text-slate-800">
                      {hotel.checkIn.startTime}{hotel.checkIn.endTime ? ` – ${hotel.checkIn.endTime}` : ""}
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
                        <span className="mt-0.5 text-slate-300">•</span>
                        <span>{inst}</span>
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
                        <span className="mt-0.5 text-slate-300">•</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Policies */}
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-xl font-bold text-[#0b1638]">
              <ShieldCheck className="h-5 w-5 text-expediaBlue" />
              Policies
            </h2>
            <PolicyCard
              icon={<PawPrint className="h-4 w-4 text-slate-500" />}
              title="Pet Policy"
              items={hotel.policies.pet}
            />
            <PolicyCard
              icon={<Baby className="h-4 w-4 text-slate-500" />}
              title="Children & Extra Bed Policy"
              items={hotel.policies.childrenAndExtraBed}
            />
            <PolicyCard
              icon={<AlertTriangle className="h-4 w-4 text-slate-500" />}
              title="Know Before You Go"
              items={hotel.policies.knowBeforeYouGo}
            />
          </div>
        </section>

        {/* ═══════════ SECTION 6: Property Knowledge Health ═══════════ */}
        <section className="mt-8">
          <KnowledgeHealthPanel hotelId={hotel.id} />
        </section>

        {/* ═══════════ Reviews + Write Review ═══════════ */}
        <section className="mt-10 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#0b1638]">Guest reviews</h2>
              <span className="text-sm text-slate-500">Showing {reviews.length} comments</span>
            </div>
            <div className="max-h-[980px] space-y-4 overflow-auto pr-2">
              {reviews.slice(0, 24).map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-card">
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Write your review</div>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">Help future guests with a quick, natural review.</h2>
              <div className="mt-5 flex items-center gap-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-6 w-6 fill-current stroke-none" />
                ))}
              </div>
              <textarea
                value={draftReview}
                onChange={(event) => setDraftReview(event.target.value)}
                placeholder="Share what stood out about your stay"
                className="mt-5 min-h-[190px] w-full rounded-[24px] border border-slate-300 px-5 py-4 text-lg leading-8 text-slate-800 outline-none transition focus:border-expediaBlue"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {["Room cleanliness", "Staff service", "Check-in", "Breakfast", "Noise level"].map((item) => (
                  <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {followUp ? (
              <div className="rounded-[30px] border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-8 shadow-card">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-semibold tracking-wide text-expediaBlue">
                  <Sparkles className="h-4 w-4" />
                  SMART FOLLOW-UP
                </div>
                <h2 className="mt-4 text-3xl font-semibold text-slate-900">{followUp.question}</h2>
                <p className="mt-3 text-[15px] leading-7 text-slate-600">{followUp.rationale}</p>

                <div className="mt-6 flex flex-wrap gap-3">
                  {followUp.quickReplies.map((reply) => (
                    <button
                      key={reply}
                      type="button"
                      onClick={() => setSelectedReply(reply)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        selectedReply === reply
                          ? "border-expediaBlue bg-expediaBlue text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:border-expediaBlue hover:text-expediaBlue"
                      }`}
                    >
                      {reply}
                    </button>
                  ))}
                </div>

                <div className="mt-5">
                  <label className="mb-2 block text-sm font-semibold text-slate-600">Add details (optional)</label>
                  <textarea
                    value={extraDetails}
                    onChange={(event) => setExtraDetails(event.target.value)}
                    placeholder="Tell us a bit more if you'd like"
                    className="min-h-[110px] w-full rounded-[20px] border border-slate-300 px-4 py-3 text-[15px] leading-7 text-slate-800 outline-none transition focus:border-expediaBlue"
                  />
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-4 rounded-[22px] border border-slate-200 bg-white px-4 py-4">
                  <button
                    type="button"
                    onClick={mockVoice}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      voiceState === "listening" ? "bg-red-600 text-white" : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    <Mic className="h-4 w-4" />
                    {voiceState === "listening" ? "Listening..." : "Answer by voice"}
                  </button>
                  <div className="text-sm text-slate-600">
                    {voiceState === "captured"
                      ? `Captured: ${voiceText}`
                      : "You can also answer with voice in one quick sentence."}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-card">
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Review submission</div>
              <p className="mt-3 text-[15px] leading-7 text-slate-600">
                When you submit, your review is added to this hotel’s review feed. The CSV-backed hotel data stays behind the scenes while the review flow stays product-first.
              </p>
              <div className="mt-5 rounded-[22px] bg-slate-50 p-4 text-sm text-slate-700">
                <div className="font-semibold text-slate-900">Preview</div>
                <p className="mt-2 whitespace-pre-wrap leading-7">
                  {[draftReview.trim(), finalFollowUpText.trim() ? `Follow-up: ${finalFollowUpText.trim()}` : ""]
                    .filter(Boolean)
                    .join("\n\n") || "Start typing your review to preview it here."}
                </p>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={submitReview}
                  disabled={!draftReview.trim() || submitting}
                  className="inline-flex items-center gap-2 rounded-full bg-expediaBlue px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? "Submitting..." : "Post review"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}