"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X, Search, ChevronDown, ChevronRight,
  Star, TrendingUp, ArrowUp, ArrowRight, ArrowDown,
  Sparkles, Clock, CheckCircle2, AlertCircle, HelpCircle,
  ShieldCheck, Smile, MessageCircle, Wifi, Coffee, Car,
  Utensils, Droplets, ThumbsUp, Volume2, DoorOpen, Dog,
  Activity,
} from "lucide-react";
import type {
  ReviewRecord,
  HotelRecord,
  KnowledgeHealthResponse,
  DimensionHealth,
  HealthStatus,
  TrendDirection,
} from "@/types";

/* ═══════════════════════════════════════════
   Constants & config
   ═══════════════════════════════════════════ */

const RATING_LABELS: Record<string, string> = {
  roomcleanliness: "Cleanliness",
  service: "Staff & Service",
  roomcomfort: "Room Comfort",
  hotelcondition: "Hotel Condition",
  roomamenitiesscore: "Room Amenities",
  ecofriendliness: "Eco-friendliness",
  valueformoney: "Value for Money",
  convenienceoflocation: "Location",
  checkin: "Check-in",
};

/** The core sub-dimension keys we surface in the sidebar */
const CORE_DIMENSIONS = [
  "roomcleanliness",
  "service",
  "roomcomfort",
  "hotelcondition",
  "roomamenitiesscore",
  "ecofriendliness",
] as const;

const TOPIC_ICONS: Record<string, React.ReactNode> = {
  breakfast:  <Coffee className="h-3.5 w-3.5" />,
  wifi:       <Wifi className="h-3.5 w-3.5" />,
  parking:    <Car className="h-3.5 w-3.5" />,
  pool:       <Droplets className="h-3.5 w-3.5" />,
  noise:      <Volume2 className="h-3.5 w-3.5" />,
  checkin:    <DoorOpen className="h-3.5 w-3.5" />,
  pet:        <Dog className="h-3.5 w-3.5" />,
  restaurant: <Utensils className="h-3.5 w-3.5" />,
  service:    <Smile className="h-3.5 w-3.5" />,
  cleanliness:<ShieldCheck className="h-3.5 w-3.5" />,
};

const STATUS_CHIP: Record<string, { label: string; bg: string; text: string }> = {
  strong_signal: { label: "Well Covered",      bg: "bg-emerald-50",  text: "text-emerald-700" },
  stable:        { label: "Medium Coverage",    bg: "bg-sky-50",      text: "text-sky-700" },
  fading:        { label: "Needs Refresh",      bg: "bg-amber-50",    text: "text-amber-700" },
  risk:          { label: "Stale",              bg: "bg-red-50",      text: "text-red-700" },
  unknown:       { label: "Uncertain",          bg: "bg-slate-100",   text: "text-slate-500" },
};

const TREND_ICON: Record<TrendDirection, typeof ArrowUp> = { up: ArrowUp, stable: ArrowRight, down: ArrowDown };
const TREND_COLOR: Record<TrendDirection, string> = { up: "text-emerald-600", stable: "text-slate-400", down: "text-red-500" };

type PropertyFactTab = "overview" | "amenities" | "checkin" | "policies";

/* ═══════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════ */

function parseRatings(raw: string): Record<string, number> {
  try {
    const obj = JSON.parse(raw);
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "number" && v > 0) out[k] = v;
    }
    return out;
  } catch { return {}; }
}

/** Aggregate average scores across all reviews for each sub-dimension */
function aggregateDimensionScores(reviews: ReviewRecord[]) {
  const sums: Record<string, { total: number; count: number }> = {};
  for (const r of reviews) {
    const ratings = parseRatings(r.ratingRaw);
    for (const [key, val] of Object.entries(ratings)) {
      if (key === "overall") continue;
      if (!sums[key]) sums[key] = { total: 0, count: 0 };
      sums[key].total += val;
      sums[key].count += 1;
    }
  }
  return Object.fromEntries(
    Object.entries(sums).map(([k, v]) => [k, { avg: +(v.total / v.count).toFixed(1), count: v.count }]),
  );
}

function ratingLabel(rating: number | null): string {
  if (!rating) return "Good";
  if (rating >= 9) return "Wonderful";
  if (rating >= 8) return "Very Good";
  if (rating >= 7) return "Good";
  if (rating >= 6) return "Satisfactory";
  return "Fair";
}

function topicFromDimension(dim: DimensionHealth): string {
  return dim.dimension.replace(/_/g, " ");
}

function getTopicIcon(topic: string): React.ReactNode {
  const lower = topic.toLowerCase();
  for (const [key, icon] of Object.entries(TOPIC_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return <Activity className="h-3.5 w-3.5" />;
}

/* ═══════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════ */

/** Horizontal score bar for sidebar dimensions */
function DimensionRow({ name, score, count, trend }: {
  name: string; score: number; count: number; trend?: TrendDirection;
}) {
  const pct = (score / 5) * 100;
  const TIcon = trend ? TREND_ICON[trend] : null;
  const tColor = trend ? TREND_COLOR[trend] : "";
  return (
    <div className="group flex items-center gap-4 py-2.5">
      <div className="w-[130px] shrink-0 text-sm text-slate-600">{name}</div>
      <div className="flex flex-1 items-center gap-3">
        <div className="h-2 flex-1 rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-expediaBlue transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-8 text-right text-sm font-bold text-slate-800">{score}</span>
      </div>
      <div className="flex w-16 items-center gap-1.5 text-xs text-slate-400">
        {count > 0 && <span>({count})</span>}
        {TIcon && <TIcon className={`h-3 w-3 ${tColor}`} />}
      </div>
    </div>
  );
}

/** Knowledge-gap topic chip */
function TopicChip({ dim }: { dim: DimensionHealth }) {
  const topic = topicFromDimension(dim);
  const cfg = STATUS_CHIP[dim.status] ?? STATUS_CHIP.unknown;
  const icon = getTopicIcon(topic);
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3.5 py-2.5 transition hover:shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="text-slate-500">{icon}</span>
        <span className="text-sm font-medium capitalize text-slate-700">{topic}</span>
      </div>
      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
        {cfg.label}
      </span>
    </div>
  );
}

/** Single review card in the feed */
function ModalReviewCard({ review }: { review: ReviewRecord }) {
  const ratings = parseRatings(review.ratingRaw);
  const overall = ratings.overall ?? null;

  const dimensionTags = useMemo(() => {
    const tags: string[] = [];
    for (const [key, val] of Object.entries(ratings)) {
      if (key === "overall") continue;
      if (val > 0 && RATING_LABELS[key]) tags.push(RATING_LABELS[key]);
    }
    return tags.slice(0, 5);
  }, [ratings]);

  return (
    <div className="border-b border-slate-100 py-5 last:border-0">
      {/* Score + name row */}
      <div className="flex items-start gap-3">
        {overall !== null && (
          <div className="flex items-baseline gap-0.5 text-lg font-bold text-slate-800">
            {overall.toFixed(1)}<span className="text-sm font-medium text-slate-400">/5</span>
            <span className="ml-2 text-base font-semibold text-slate-700">
              {overall >= 4.5 ? "Excellent" : overall >= 4 ? "Very Good" : overall >= 3.5 ? "Good" : overall >= 3 ? "Okay" : ""}
            </span>
          </div>
        )}
      </div>
      {/* Reviewer meta */}
      <div className="mt-1.5 flex items-center gap-2 text-sm text-slate-500">
        <span className="font-semibold text-slate-700">Guest</span>
        <span>·</span>
        <span>{review.date}</span>
        {review.source === "seed" && (
          <>
            <span>·</span>
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="h-3 w-3" /> Verified review
            </span>
          </>
        )}
      </div>

      {/* Review text */}
      {review.title && (
        <p className="mt-3 text-[15px] font-semibold text-slate-800">{review.title}</p>
      )}
      <p className="mt-1.5 text-sm leading-6 text-slate-600 line-clamp-3">{review.text}</p>

      {/* Dimension tags */}
      {dimensionTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {dimensionTags.map((tag) => (
            <span key={tag} className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** AI insight strip card */
function InsightCard({ icon, title, items }: {
  icon: React.ReactNode; title: string; items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex-1 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        {icon}
        {title}
      </div>
      <ul className="mt-2.5 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs leading-5 text-slate-500">
            <span className="mt-0.5 text-slate-300">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Property Facts Tabs
   ═══════════════════════════════════════════ */

function PropertyFactsTabs({ hotel, activeTab, setActiveTab }: {
  hotel: HotelRecord; activeTab: PropertyFactTab; setActiveTab: (t: PropertyFactTab) => void;
}) {
  const tabs: { key: PropertyFactTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "amenities", label: "Amenities" },
    { key: "checkin", label: "Check-in & out" },
    { key: "policies", label: "Policies" },
  ];

  return (
    <div className="rounded-2xl border border-slate-100 bg-white">
      {/* Tab bar */}
      <div className="flex border-b border-slate-100">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-3 text-xs font-semibold tracking-wide transition ${
              activeTab === t.key
                ? "border-b-2 border-expediaBlue text-expediaBlue"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4 text-sm leading-6 text-slate-600">
        {activeTab === "overview" && (
          <div>
            <p>{hotel.description || "No description available."}</p>
            {hotel.areaDescription && (
              <p className="mt-3 text-slate-500">{hotel.areaDescription}</p>
            )}
          </div>
        )}
        {activeTab === "amenities" && (
          <div className="flex flex-wrap gap-2">
            {hotel.popularAmenities.map((a) => (
              <span key={a} className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                {a}
              </span>
            ))}
          </div>
        )}
        {activeTab === "checkin" && (
          <div className="space-y-2">
            {hotel.checkIn.startTime && (
              <p><span className="font-semibold text-slate-700">Check-in:</span> {hotel.checkIn.startTime}{hotel.checkIn.endTime ? ` – ${hotel.checkIn.endTime}` : ""}</p>
            )}
            {hotel.checkOut.time && (
              <p><span className="font-semibold text-slate-700">Check-out:</span> {hotel.checkOut.time}</p>
            )}
            {hotel.checkIn.instructions.length > 0 && (
              <ul className="mt-2 space-y-1">
                {hotel.checkIn.instructions.map((inst, i) => (
                  <li key={i} className="text-xs text-slate-500">• {inst}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {activeTab === "policies" && (
          <div className="space-y-3">
            {hotel.policies.pet.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Pet Policy</div>
                {hotel.policies.pet.map((p, i) => <p key={i} className="text-xs text-slate-500">• {p.replace(/<\/?[^>]+(>|$)/g, "")}</p>)}
              </div>
            )}
            {hotel.policies.childrenAndExtraBed.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Children & Extra Beds</div>
                {hotel.policies.childrenAndExtraBed.map((p, i) => <p key={i} className="text-xs text-slate-500">• {p.replace(/<\/?[^>]+(>|$)/g, "")}</p>)}
              </div>
            )}
            {hotel.policies.knowBeforeYouGo.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-700">Know Before You Go</div>
                {hotel.policies.knowBeforeYouGo.map((p, i) => <p key={i} className="text-xs text-slate-500">• {p.replace(/<\/?[^>]+(>|$)/g, "")}</p>)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Source badge */}
      <div className="border-t border-slate-50 px-4 py-2">
        <span className="text-[10px] font-medium text-slate-400">Source: Property listing data</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main Modal
   ═══════════════════════════════════════════ */

type SortOption = "relevant" | "newest" | "highest" | "lowest";

export function ReviewIntelligenceModal({ hotel, reviews, onClose }: {
  hotel: HotelRecord;
  reviews: ReviewRecord[];
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("relevant");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [health, setHealth] = useState<KnowledgeHealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  // Load knowledge health data
  useEffect(() => {
    let cancelled = false;
    setHealthLoading(true);
    fetch(`/api/hotels/${hotel.id}/knowledge-health`)
      .then((res) => res.ok ? res.json() : null)
      .then((json) => { if (!cancelled) setHealth(json); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setHealthLoading(false); });
    return () => { cancelled = true; };
  }, [hotel.id]);

  // Aggregate dimension scores from structured review data
  const dimScores = useMemo(() => aggregateDimensionScores(reviews), [reviews]);

  // Match dimension health to score rows (merge knowledge-health trend with review-based score)
  const coreDimensions = useMemo(() => {
    return CORE_DIMENSIONS.map((key) => {
      const score = dimScores[key];
      // Try to find a matching knowledge-health dimension
      const khDim = health?.dimensions.find(
        (d) => d.dimension.toLowerCase().includes(key.replace(/score$/, "")) || d.label.toLowerCase().includes((RATING_LABELS[key] ?? "").toLowerCase()),
      );
      return {
        key,
        label: RATING_LABELS[key] ?? key,
        score: score ? score.avg : (khDim?.avgRating ?? 0),
        count: score ? score.count : (khDim?.totalMentions ?? 0),
        trend: khDim?.trend as TrendDirection | undefined,
      };
    });
  }, [dimScores, health]);

  // Overall average
  const overallAvg = useMemo(() => {
    const withScores = coreDimensions.filter((d) => d.score > 0);
    if (withScores.length === 0) return hotel.rating ?? 0;
    const sum = withScores.reduce((a, b) => a + b.score, 0);
    return +(sum / withScores.length).toFixed(1);
  }, [coreDimensions, hotel.rating]);

  // AI-derived insights
  const guestLiked = useMemo(() => {
    if (!health) return [];
    return health.dimensions
      .filter((d) => d.status === "strong_signal" || d.status === "stable")
      .slice(0, 3)
      .map((d) => d.summary);
  }, [health]);

  const needsConfirm = useMemo(() => {
    if (!health) return [];
    return health.dimensions
      .filter((d) => d.status === "fading" || d.status === "risk")
      .slice(0, 3)
      .map((d) => `${d.label}: ${d.refreshReason}`);
  }, [health]);

  const suggestedQs = useMemo(() => {
    if (!health) return [];
    return health.suggestedQuestions.slice(0, 3).map((q) => q.question);
  }, [health]);

  // Knowledge-gap dimensions for sidebar
  const gapDimensions = useMemo(() => {
    if (!health) return [];
    return health.dimensions.slice(0, 7);
  }, [health]);

  // Filtered + sorted reviews
  const filteredReviews = useMemo(() => {
    let result = [...reviews];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          (r.title ?? "").toLowerCase().includes(q) ||
          r.text.toLowerCase().includes(q),
      );
    }
    switch (sort) {
      case "newest":
        result.sort((a, b) => b.date.localeCompare(a.date));
        break;
      case "highest": {
        const sc = (r: ReviewRecord) => parseRatings(r.ratingRaw).overall ?? 0;
        result.sort((a, b) => sc(b) - sc(a));
        break;
      }
      case "lowest": {
        const sc = (r: ReviewRecord) => parseRatings(r.ratingRaw).overall ?? 0;
        result.sort((a, b) => sc(a) - sc(b));
        break;
      }
    }
    return result;
  }, [reviews, search, sort]);

  // ESC to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sortLabels: Record<SortOption, string> = {
    relevant: "Most relevant",
    newest: "Newest first",
    highest: "Highest rated",
    lowest: "Lowest rated",
  };

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      {/* Modal container */}
      <div
        className="relative flex h-[92vh] w-[94vw] max-w-[1400px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between border-b border-slate-100 px-8 py-5">
          <h2 className="text-xl font-bold text-slate-900">Guest Reviews & Property Intelligence</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Body: 2-column ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ═══════════ LEFT SIDEBAR ═══════════ */}
          <aside className="w-[380px] shrink-0 overflow-y-auto border-r border-slate-100 bg-slate-50/50 px-7 py-6">

            {/* Overall score block */}
            <div className="flex items-center gap-5">
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-emerald-700">
                <span className="text-2xl font-bold text-white">{(hotel.rating ?? overallAvg).toFixed(1)}</span>
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900">{ratingLabel(hotel.rating)}</div>
                <div className="mt-0.5 text-sm text-slate-500">{reviews.length} verified reviews</div>
              </div>
            </div>

            {/* AI summary card */}
            {health?.aiSummary && (
              <div className="mt-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-expediaBlue">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Summary
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{health.aiSummary}</p>
                <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5" /> From real guest reviews summarized by AI.
                </div>
              </div>
            )}

            {/* Core rated dimensions */}
            <div className="mt-7">
              <h3 className="text-sm font-bold text-slate-800">Review Dimensions</h3>
              <div className="mt-3 divide-y divide-slate-100">
                {coreDimensions.map((d) => (
                  <DimensionRow
                    key={d.key}
                    name={d.label}
                    score={d.score}
                    count={d.count}
                    trend={d.trend}
                  />
                ))}
              </div>
            </div>

            {/* Knowledge gaps */}
            {gapDimensions.length > 0 && (
              <div className="mt-7">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Knowledge Coverage
                </h3>
                <p className="mt-1 text-xs text-slate-400">AI-assessed freshness of key topics</p>
                <div className="mt-3 space-y-2">
                  {gapDimensions.map((dim) => (
                    <TopicChip key={dim.dimension} dim={dim} />
                  ))}
                </div>
              </div>
            )}

            {healthLoading && (
              <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
                <TrendingUp className="h-4 w-4 animate-pulse" />
                Analyzing coverage...
              </div>
            )}

          </aside>

          {/* ═══════════ RIGHT CONTENT ═══════════ */}
          <div className="flex flex-1 flex-col overflow-hidden">

            {/* AI intelligence strip */}
            <div className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/50 px-7 py-5">
              <div className="flex gap-4">
                <InsightCard
                  icon={<ThumbsUp className="h-4 w-4 text-emerald-600" />}
                  title="What guests liked"
                  items={guestLiked}
                />
                <InsightCard
                  icon={<Clock className="h-4 w-4 text-amber-500" />}
                  title="Needs recent confirmation"
                  items={needsConfirm}
                />
                <InsightCard
                  icon={<MessageCircle className="h-4 w-4 text-expediaBlue" />}
                  title="Suggested follow-ups"
                  items={suggestedQs}
                />
              </div>
            </div>

            {/* Search + sort bar */}
            <div className="flex items-center justify-between border-b border-slate-100 px-7 py-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-slate-800">All Reviews</h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  {filteredReviews.length}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search reviews..."
                    className="h-9 w-56 rounded-full border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-700 outline-none transition focus:border-expediaBlue focus:ring-1 focus:ring-expediaBlue/20"
                  />
                </div>
                {/* Sort */}
                <div className="relative">
                  <button
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300"
                  >
                    Sort by <span className="font-semibold text-expediaBlue">{sortLabels[sort]}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                  {showSortMenu && (
                    <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                      {(Object.entries(sortLabels) as [SortOption, string][]).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => { setSort(key); setShowSortMenu(false); }}
                          className={`block w-full px-4 py-2 text-left text-sm transition hover:bg-slate-50 ${
                            sort === key ? "font-semibold text-expediaBlue" : "text-slate-600"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Review feed */}
            <div className="flex-1 overflow-y-auto px-7">
              {filteredReviews.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-sm text-slate-400">
                  No reviews match your search.
                </div>
              ) : (
                filteredReviews.slice(0, 30).map((review) => (
                  <ModalReviewCard key={review.id} review={review} />
                ))
              )}
              {filteredReviews.length > 30 && (
                <div className="py-6 text-center text-sm text-slate-400">
                  Showing 30 of {filteredReviews.length} reviews
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Inline Panel (embedded in page)
   ═══════════════════════════════════════════ */

export function ReviewIntelligencePanel({ hotel, reviews }: {
  hotel: HotelRecord;
  reviews: ReviewRecord[];
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("relevant");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [health, setHealth] = useState<KnowledgeHealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setHealthLoading(true);
    fetch(`/api/hotels/${hotel.id}/knowledge-health`)
      .then((res) => res.ok ? res.json() : null)
      .then((json) => { if (!cancelled) setHealth(json); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setHealthLoading(false); });
    return () => { cancelled = true; };
  }, [hotel.id]);

  const dimScores = useMemo(() => aggregateDimensionScores(reviews), [reviews]);

  const coreDimensions = useMemo(() => {
    return CORE_DIMENSIONS.map((key) => {
      const score = dimScores[key];
      const khDim = health?.dimensions.find(
        (d) => d.dimension.toLowerCase().includes(key.replace(/score$/, "")) || d.label.toLowerCase().includes((RATING_LABELS[key] ?? "").toLowerCase()),
      );
      return {
        key,
        label: RATING_LABELS[key] ?? key,
        score: score ? score.avg : (khDim?.avgRating ?? 0),
        count: score ? score.count : (khDim?.totalMentions ?? 0),
        trend: khDim?.trend as TrendDirection | undefined,
      };
    });
  }, [dimScores, health]);

  const overallAvg = useMemo(() => {
    const withScores = coreDimensions.filter((d) => d.score > 0);
    if (withScores.length === 0) return hotel.rating ?? 0;
    return +(withScores.reduce((a, b) => a + b.score, 0) / withScores.length).toFixed(1);
  }, [coreDimensions, hotel.rating]);

  const guestLiked = useMemo(() => {
    if (!health) return [];
    return health.dimensions.filter((d) => d.status === "strong_signal" || d.status === "stable").slice(0, 3).map((d) => d.summary);
  }, [health]);

  const needsConfirm = useMemo(() => {
    if (!health) return [];
    return health.dimensions.filter((d) => d.status === "fading" || d.status === "risk").slice(0, 3).map((d) => `${d.label}: ${d.refreshReason}`);
  }, [health]);

  const suggestedQs = useMemo(() => {
    if (!health) return [];
    return health.suggestedQuestions.slice(0, 3).map((q) => q.question);
  }, [health]);

  const gapDimensions = useMemo(() => health?.dimensions.slice(0, 7) ?? [], [health]);

  const filteredReviews = useMemo(() => {
    let result = [...reviews];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) => (r.title ?? "").toLowerCase().includes(q) || r.text.toLowerCase().includes(q));
    }
    switch (sort) {
      case "newest": result.sort((a, b) => b.date.localeCompare(a.date)); break;
      case "highest": { const sc = (r: ReviewRecord) => parseRatings(r.ratingRaw).overall ?? 0; result.sort((a, b) => sc(b) - sc(a)); break; }
      case "lowest": { const sc = (r: ReviewRecord) => parseRatings(r.ratingRaw).overall ?? 0; result.sort((a, b) => sc(a) - sc(b)); break; }
    }
    return result;
  }, [reviews, search, sort]);

  const sortLabels: Record<SortOption, string> = {
    relevant: "Most relevant",
    newest: "Newest first",
    highest: "Highest rated",
    lowest: "Lowest rated",
  };

  return (
    <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-card">
      {/* Header */}
      <div className="border-b border-slate-100 px-8 py-6">
        <h2 className="text-2xl font-bold text-slate-900">Guest Reviews & Property Intelligence</h2>
        <p className="mt-1 text-sm text-slate-500">AI-powered analysis across {reviews.length} verified reviews</p>
      </div>

      {/* AI insight strip */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white px-8 py-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <InsightCard icon={<ThumbsUp className="h-4 w-4 text-emerald-600" />} title="What guests liked" items={guestLiked} />
          <InsightCard icon={<Clock className="h-4 w-4 text-amber-500" />} title="Needs recent confirmation" items={needsConfirm} />
          <InsightCard icon={<MessageCircle className="h-4 w-4 text-expediaBlue" />} title="Suggested follow-ups" items={suggestedQs} />
        </div>
      </div>

      {/* 2-column body */}
      <div className="flex">
        {/* ── Left sidebar ── */}
        <aside className="w-[360px] shrink-0 border-r border-slate-100 bg-slate-50/40 px-7 py-6">
          {/* Score */}
          <div className="flex items-center gap-5">
            <div className="flex h-[68px] w-[68px] items-center justify-center rounded-2xl bg-emerald-700">
              <span className="text-2xl font-bold text-white">{(hotel.rating ?? overallAvg).toFixed(1)}</span>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">{ratingLabel(hotel.rating)}</div>
              <div className="mt-0.5 text-sm text-slate-500">{reviews.length} verified reviews</div>
            </div>
          </div>

          {/* AI summary */}
          {health?.aiSummary && (
            <div className="mt-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-expediaBlue">
                <Sparkles className="h-3.5 w-3.5" /> AI Summary
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{health.aiSummary}</p>
              <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                <Sparkles className="h-2.5 w-2.5" /> From real guest reviews summarized by AI.
              </div>
            </div>
          )}

          {/* Core dimensions */}
          <div className="mt-7">
            <h3 className="text-sm font-bold text-slate-800">Review Dimensions</h3>
            <div className="mt-3 divide-y divide-slate-100">
              {coreDimensions.map((d) => (
                <DimensionRow key={d.key} name={d.label} score={d.score} count={d.count} trend={d.trend} />
              ))}
            </div>
          </div>

          {/* Knowledge coverage */}
          {gapDimensions.length > 0 && (
            <div className="mt-7">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <AlertCircle className="h-4 w-4 text-amber-500" /> Knowledge Coverage
              </h3>
              <p className="mt-1 text-xs text-slate-400">AI-assessed freshness of key topics</p>
              <div className="mt-3 space-y-2">
                {gapDimensions.map((dim) => <TopicChip key={dim.dimension} dim={dim} />)}
              </div>
            </div>
          )}

          {healthLoading && (
            <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
              <TrendingUp className="h-4 w-4 animate-pulse" /> Analyzing coverage...
            </div>
          )}

        </aside>

        {/* ── Right: review feed ── */}
        <div className="flex flex-1 flex-col">
          {/* Search + sort */}
          <div className="flex items-center justify-between border-b border-slate-100 px-7 py-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-slate-800">All Reviews</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{filteredReviews.length}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search reviews..."
                  className="h-9 w-56 rounded-full border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-700 outline-none transition focus:border-expediaBlue focus:ring-1 focus:ring-expediaBlue/20"
                />
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300"
                >
                  Sort by <span className="font-semibold text-expediaBlue">{sortLabels[sort]}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
                {showSortMenu && (
                  <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    {(Object.entries(sortLabels) as [SortOption, string][]).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => { setSort(key); setShowSortMenu(false); }}
                        className={`block w-full px-4 py-2 text-left text-sm transition hover:bg-slate-50 ${sort === key ? "font-semibold text-expediaBlue" : "text-slate-600"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Review list */}
          <div className="max-h-[900px] overflow-y-auto px-7">
            {filteredReviews.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-slate-400">No reviews match your search.</div>
            ) : (
              filteredReviews.slice(0, 30).map((review) => <ModalReviewCard key={review.id} review={review} />)
            )}
            {filteredReviews.length > 30 && (
              <div className="py-6 text-center text-sm text-slate-400">Showing 30 of {filteredReviews.length} reviews</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
