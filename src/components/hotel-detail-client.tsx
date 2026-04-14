"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, MapPin, Mic, Send, Sparkles, Star } from "lucide-react";
import { FollowUpResponse, HotelRecord, HotelSummaryResponse, ReviewRecord } from "@/types";
import { getHotelImage, hotelGradient, hotelSubtitle, initials } from "@/lib/hotel-display";
import { ReviewCard } from "@/components/review-card";
import { SiteHeader } from "@/components/site-header";

const fallbackReview = "The room was very clean and the staff were friendly. Check-in was smooth.";

export function HotelDetailClient({ hotel }: { hotel: HotelRecord }) {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [summary, setSummary] = useState<HotelSummaryResponse | null>(null);
  const [draftReview, setDraftReview] = useState(fallbackReview);
  const [followUp, setFollowUp] = useState<FollowUpResponse | null>(null);
  const [selectedReply, setSelectedReply] = useState("");
  const [extraDetails, setExtraDetails] = useState("");
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "captured">("idle");
  const [voiceText, setVoiceText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadHotelContext() {
      const [reviewsRes, summaryRes] = await Promise.all([
        fetch(`/api/hotels/${hotel.id}/reviews`),
        fetch(`/api/hotels/${hotel.id}/summary`),
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

        <section className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-card">
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              <div className={`relative overflow-hidden rounded-[26px] bg-gradient-to-br ${hotelGradient(2)} p-6 text-white`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getHotelImage(hotel)} alt={hotel.name} className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/15" />
                <div className="relative rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">Selected hotel</div>
                <div className="relative mt-8 text-6xl font-bold">{initials(hotel)}</div>
                <div className="relative mt-2 text-lg opacity-90">{hotelSubtitle(hotel)}</div>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-[#0b1638]">{hotel.name}</h1>
                <div className="mt-3 flex items-center gap-2 text-slate-600">
                  <MapPin className="h-4 w-4" />
                  {hotelSubtitle(hotel)}
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <span className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-bold text-white">{(hotel.rating ?? 8).toFixed(1)}</span>
                  <span className="text-sm text-slate-600">{hotel.reviewCount} guest comments</span>
                </div>
                <p className="mt-5 text-[15px] leading-7 text-slate-700">{hotel.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {hotel.amenities.map((amenity) => (
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
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">AI guest snapshot</h2>
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