"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  Mic,
  Send,
  Sparkles,
  Star,
  CheckCircle2,
} from "lucide-react";
import { FollowUpResponse, HotelRecord, HotelSummaryResponse, ReviewRecord } from "@/types";

const fallbackReview = "The room was very clean and the staff were friendly. Check-in was smooth.";

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

function formatReviewDate(value: string) {
  return value;
}

function ReviewCard({ review }: { review: ReviewRecord }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-500">{review.source === "user" ? "Just added" : formatReviewDate(review.date)}</div>
        {review.source === "user" && (
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-expediaBlue">New review</span>
        )}
      </div>
      {review.title ? <h4 className="mt-2 text-lg font-semibold text-slate-900">{review.title}</h4> : null}
      <p className="mt-2 text-[15px] leading-7 text-slate-700">{review.text}</p>
    </div>
  );
}

export default function HomePage() {
  const [hotels, setHotels] = useState<HotelRecord[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string>("");
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [summary, setSummary] = useState<HotelSummaryResponse | null>(null);
  const [draftReview, setDraftReview] = useState(fallbackReview);
  const [followUp, setFollowUp] = useState<FollowUpResponse | null>(null);
  const [selectedReply, setSelectedReply] = useState("");
  const [extraDetails, setExtraDetails] = useState("");
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "captured">("idle");
  const [voiceText, setVoiceText] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadHotels() {
      const response = await fetch("/api/hotels");
      const json = await response.json();
      setHotels(json.hotels ?? []);
      if (json.hotels?.length) {
        setSelectedHotelId(json.hotels[0].id);
      }
    }
    void loadHotels();
  }, []);

  useEffect(() => {
    if (!selectedHotelId) return;

    async function loadHotelContext() {
      const [reviewsRes, summaryRes] = await Promise.all([
        fetch(`/api/hotels/${selectedHotelId}/reviews`),
        fetch(`/api/hotels/${selectedHotelId}/summary`),
      ]);

      const reviewsJson = await reviewsRes.json();
      const summaryJson = await summaryRes.json();
      setReviews(reviewsJson.reviews ?? []);
      setSummary(summaryJson);
      setSelectedReply("");
      setExtraDetails("");
      setVoiceText("");
      setVoiceState("idle");
    }

    void loadHotelContext();
  }, [selectedHotelId]);

  useEffect(() => {
    if (!selectedHotelId || !draftReview.trim()) return;

    const timer = setTimeout(async () => {
      const response = await fetch(`/api/hotels/${selectedHotelId}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftReview }),
      });
      const json = await response.json();
      setFollowUp(json);
    }, 450);

    return () => clearTimeout(timer);
  }, [selectedHotelId, draftReview]);

  const selectedHotel = useMemo(
    () => hotels.find((hotel) => hotel.id === selectedHotelId) ?? null,
    [hotels, selectedHotelId],
  );

  const finalFollowUpText = useMemo(
    () => [selectedReply, extraDetails.trim(), voiceText.trim()].filter(Boolean).join(". "),
    [selectedReply, extraDetails, voiceText],
  );

  async function submitReview() {
    if (!selectedHotelId || !draftReview.trim()) return;
    setSubmitting(true);

    const combined = [draftReview.trim(), finalFollowUpText.trim()].filter(Boolean).join("\n\nFollow-up: ");

    await fetch(`/api/hotels/${selectedHotelId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: combined }),
    });

    const reviewsRes = await fetch(`/api/hotels/${selectedHotelId}/reviews`);
    const reviewsJson = await reviewsRes.json();
    setReviews(reviewsJson.reviews ?? []);
    setDraftReview("");
    setSelectedReply("");
    setExtraDetails("");
    setVoiceText("");
    setVoiceState("idle");
    setSubmitting(false);
  }

  function toggleFavorite(id: string) {
    setFavoriteIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
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
              const selected = hotel.id === selectedHotelId;
              return (
                <button
                  key={hotel.id}
                  type="button"
                  onClick={() => setSelectedHotelId(hotel.id)}
                  className={`overflow-hidden rounded-[28px] border bg-white text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-lg ${
                    selected ? "border-expediaBlue ring-2 ring-expediaBlue/20" : "border-slate-200"
                  }`}
                >
                  <div className={`relative h-52 bg-gradient-to-br ${hotelGradient(index)} p-4 text-white`}>
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

        {selectedHotel ? (
          <>
            <section className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-card">
                <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                  <div className={`rounded-[26px] bg-gradient-to-br ${hotelGradient(2)} p-6 text-white`}>
                    <div className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">Selected hotel</div>
                    <div className="mt-8 text-6xl font-bold">{initials(selectedHotel)}</div>
                    <div className="mt-2 text-lg opacity-90">{hotelSubtitle(selectedHotel)}</div>
                  </div>
                  <div>
                    <h2 className="text-4xl font-bold text-[#0b1638]">{selectedHotel.name}</h2>
                    <div className="mt-3 flex items-center gap-2 text-slate-600">
                      <MapPin className="h-4 w-4" />
                      {hotelSubtitle(selectedHotel)}
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <span className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-bold text-white">{(selectedHotel.rating ?? 8).toFixed(1)}</span>
                      <span className="text-sm text-slate-600">{selectedHotel.reviewCount} guest comments</span>
                    </div>
                    <p className="mt-5 text-[15px] leading-7 text-slate-700">{selectedHotel.description}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {selectedHotel.amenities.map((amenity) => (
                        <span key={amenity} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-card">
                <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">What guests are saying</div>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">AI guest snapshot</h3>
                <p className="mt-4 text-[15px] leading-7 text-slate-700">{summary?.summary ?? "Loading a concise guest snapshot..."}</p>
                <div className="mt-5 space-y-3">
                  {(summary?.highlights ?? []).map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-10 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-[#0b1638]">Guest reviews</h3>
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
                  <h3 className="mt-2 text-3xl font-semibold text-slate-900">Help future guests with a quick, natural review.</h3>
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
                    <h3 className="mt-4 text-3xl font-semibold text-slate-900">{followUp.question}</h3>
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
                    When you submit, your review is added to this hotel’s review feed. The CSV-backed hotel data stays behind the scenes — the UI stays product-first.
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
          </>
        ) : null}
      </div>
    </main>
  );
}
