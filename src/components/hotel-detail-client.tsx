"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, MapPin, Mic, Send, Sparkles, Star } from "lucide-react";
import { FollowUpResponse, HotelRecord, HotelSummaryResponse, ReviewRecord } from "@/types";
import { formatAreaDescription, formatHotelDescription, getHotelGallery, hotelSubtitle } from "@/lib/hotel-display";
import { extractTopKeywords, getRatingDistribution, parseReviewRating, sortReviews } from "@/lib/review-insights";
import { HotelGallery } from "@/components/hotel-gallery";
import { ReviewCard } from "@/components/review-card";
import { SiteHeader } from "@/components/site-header";

const fallbackReview = "The room was very clean and the staff were friendly. Check-in was smooth.";
const tabs = ["overview", "reviews", "write-review"] as const;
type TabKey = (typeof tabs)[number];

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
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [reviewSort, setReviewSort] = useState<"recent" | "top-rated" | "detailed">("recent");
  const gallery = useMemo(() => getHotelGallery(hotel), [hotel]);
  const sortedReviews = useMemo(() => sortReviews(reviews, reviewSort), [reviewSort, reviews]);
  const topKeywords = useMemo(() => extractTopKeywords(reviews), [reviews]);
  const ratingDistribution = useMemo(() => getRatingDistribution(reviews), [reviews]);
  const averageReviewScore = useMemo(() => {
    const scores = reviews.map((review) => parseReviewRating(review).overall).filter((score): score is number => score !== null);
    if (!scores.length) return null;
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }, [reviews]);
  const ratedReviewCount = useMemo(() => reviews.filter((review) => parseReviewRating(review).overall !== null).length, [reviews]);
  const maxDistribution = Math.max(...ratingDistribution.map((bucket) => bucket.count), 1);
  const summaryPros = summary?.pros ?? [];
  const summaryCons = summary?.cons ?? [];
  const sentiment = summary?.sentiment ?? { positive: [], mixed: [], negative: [] };

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
    setActiveTab("reviews");
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

        <section className="mt-6 grid gap-8 xl:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-card">
            <HotelGallery images={gallery} title={hotel.name} />
          </div>

          <div className="space-y-6">
            <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-card">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-expediaBlue">Hotel overview</div>
              <h1 className="mt-3 text-4xl font-bold text-[#0b1638]">{hotel.name}</h1>
              <div className="mt-3 flex items-center gap-2 text-slate-600">
                <MapPin className="h-4 w-4" />
                {hotelSubtitle(hotel)}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-bold text-white">{(hotel.rating ?? 8).toFixed(1)}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">{hotel.reviewCount} guest comments</span>
                {hotel.starRating ? (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">{hotel.starRating.toFixed(1)} star</span>
                ) : null}
              </div>
              <p className="mt-5 text-[15px] leading-7 text-slate-700">{formatHotelDescription(hotel)}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {hotel.amenities.slice(0, 8).map((amenity) => (
                  <span key={amenity} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-card">
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">AI guest snapshot</div>
              <p className="mt-4 text-[15px] leading-7 text-slate-700">{summary?.summary ?? "Loading a concise guest snapshot..."}</p>
              <div className="mt-5 space-y-3">
                {(summary?.highlights ?? []).slice(0, 3).map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[32px] border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex flex-wrap gap-3">
            {[
              ["overview", "Overview"],
              ["reviews", `Reviews (${reviews.length})`],
              ["write-review", "Write a review"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value as TabKey)}
                className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                  activeTab === value
                    ? "bg-expediaBlue text-white shadow-sm"
                    : "border border-slate-300 text-slate-700 hover:border-expediaBlue hover:text-expediaBlue"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {activeTab === "overview" ? (
          <section className="mt-8 grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-card">
                <h2 className="text-2xl font-bold text-[#0b1638]">Property story</h2>
                <p className="mt-4 text-[15px] leading-8 text-slate-700">{formatAreaDescription(hotel)}</p>
              </div>

              <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-card">
                <h2 className="text-2xl font-bold text-[#0b1638]">Amenities guests care about</h2>
                <div className="mt-5 flex flex-wrap gap-3">
                  {hotel.amenities.map((amenity) => (
                    <span key={amenity} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-card">
                <h2 className="text-2xl font-bold text-[#0b1638]">Review highlights</h2>
                <div className="mt-5 space-y-4">
                  {(summary?.highlights ?? []).map((item) => (
                    <div key={item} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-card">
                <h2 className="text-2xl font-bold text-[#0b1638]">Photo gallery</h2>
                <div className="mt-5">
                  <HotelGallery images={gallery} title={`${hotel.name} gallery`} compact />
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "reviews" ? (
          <section className="mt-8 grid gap-8 xl:grid-cols-[1fr_0.7fr]">
            <div>
              <div className="mb-6 rounded-[30px] border border-slate-200 bg-white p-6 shadow-card">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-[#0b1638]">Guest reviews</h2>
                    <p className="mt-1 text-sm text-slate-500">Showing {reviews.length} comments with sortable guest feedback and extracted themes.</p>
                  </div>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600">
                    Sort reviews
                    <select
                      value={reviewSort}
                      onChange={(event) => setReviewSort(event.target.value as "recent" | "top-rated" | "detailed")}
                      className="rounded-2xl border border-slate-300 px-4 py-3 text-base font-medium text-slate-900 outline-none transition focus:border-expediaBlue"
                    >
                      <option value="recent">Most recent</option>
                      <option value="top-rated">Top rated</option>
                      <option value="detailed">Most detailed</option>
                    </select>
                  </label>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-[24px] bg-slate-50 p-5">
                    <div className="text-sm font-semibold text-slate-500">Average score</div>
                    <div className="mt-2 text-3xl font-bold text-[#0b1638]">{averageReviewScore ? averageReviewScore.toFixed(1) : "N/A"}</div>
                    <div className="mt-1 text-sm text-slate-500">Based on {ratedReviewCount} rated reviews</div>
                  </div>
                  <div className="rounded-[24px] bg-slate-50 p-5">
                    <div className="text-sm font-semibold text-slate-500">Top topics</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {topKeywords.slice(0, 4).map((keyword) => (
                        <span key={keyword.label} className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
                          {keyword.label} <span className="text-slate-400">{keyword.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[24px] bg-slate-50 p-5">
                    <div className="text-sm font-semibold text-slate-500">Review cadence</div>
                    <div className="mt-2 text-3xl font-bold text-[#0b1638]">{reviews.length}</div>
                    <div className="mt-1 text-sm text-slate-500">Total comments in this property feed</div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {sortedReviews.slice(0, 24).map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-card">
                <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Review pulse</div>
                <p className="mt-4 text-[15px] leading-7 text-slate-700">{summary?.summary ?? "Loading guest pulse..."}</p>
              </div>
              <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-card">
                <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">AI pros and cons</div>
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-[22px] bg-emerald-50 p-5">
                    <div className="text-sm font-semibold text-emerald-700">Pros</div>
                    <div className="mt-3 space-y-2">
                      {summaryPros.map((item) => (
                        <div key={item} className="text-sm leading-7 text-slate-700">+ {item}</div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[22px] bg-rose-50 p-5">
                    <div className="text-sm font-semibold text-rose-700">Cons</div>
                    <div className="mt-3 space-y-2">
                      {summaryCons.map((item) => (
                        <div key={item} className="text-sm leading-7 text-slate-700">- {item}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-card">
                <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Rating distribution</div>
                <div className="mt-5 space-y-4">
                  {ratingDistribution.map((bucket) => (
                    <div key={bucket.stars} className="grid grid-cols-[52px_1fr_36px] items-center gap-3 text-sm text-slate-700">
                      <div className="font-semibold text-slate-600">{bucket.stars} star</div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-expediaBlue transition-all"
                          style={{ width: `${(bucket.count / maxDistribution) * 100}%` }}
                        />
                      </div>
                      <div className="text-right font-semibold text-slate-500">{bucket.count}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-card">
                <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Sentiment segments</div>
                <div className="mt-5 space-y-4">
                  {[
                    ["Positive", sentiment.positive, "emerald"],
                    ["Mixed", sentiment.mixed, "amber"],
                    ["Negative", sentiment.negative, "rose"],
                  ].map(([label, items, tone]) => (
                    <div key={label} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                      <div className={`text-sm font-semibold ${tone === "emerald" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : "text-rose-700"}`}>
                        {label}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(items as string[]).map((item) => (
                          <span key={item} className="rounded-full bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-card">
                <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Keyword aggregation</div>
                <div className="mt-5 flex flex-wrap gap-3">
                  {topKeywords.map((keyword) => (
                    <div key={keyword.label} className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">{keyword.label}</span>
                      <span className="ml-2 text-slate-500">mentioned {keyword.count}x</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-card">
                <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Photo companion</div>
                <div className="mt-5">
                  <HotelGallery images={gallery} title={`${hotel.name} highlights`} compact />
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "write-review" ? (
          <section className="mt-8 grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
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

              <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-card">
                <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Review submission</div>
                <p className="mt-3 text-[15px] leading-7 text-slate-600">
                  When you submit, your review is added to this hotel’s review feed. The hotel data stays behind the scenes while the review flow stays product-first.
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

            <div className="space-y-6">
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
                <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Reference reviews</div>
                <div className="mt-5 space-y-4">
                  {reviews.slice(0, 3).map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}