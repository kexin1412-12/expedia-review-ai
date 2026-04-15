import type {
  HotelRecord,
  ReviewRecord,
  HealthStatus,
  TrendDirection,
  TimelineEntry,
  DimensionHealth,
  DiscoveredDimension,
  ReviewDimensionTag,
  KnowledgeHealthResponse,
  SuggestedQuestion,
  TopicVolatility,
} from "@/types";
import { discoverDimensions, tagReviewsDimensions, refineHealthWithAI } from "./ai";

/* ====================================
   Utility helpers
   ==================================== */

function parseReviewDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
      return new Date(year, month - 1, day);
    }
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}

function normalizeText(input: string): string {
  return input.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAnyKeyword(text: string, keywords: string[]): boolean {
  const normalized = normalizeText(text);
  return keywords.some((kw) => normalized.includes(normalizeText(kw)));
}

/* ====================================
   Parsed reviews
   ==================================== */

/** Generic / template phrases that carry no real information */
const GENERIC_PATTERNS = [
  /^(good|great|nice|ok|okay|fine|bad|terrible|awful|excellent|amazing|perfect|worst|best)[\.!]*$/i,
  /^(loved it|hated it|not bad|very good|very bad|highly recommend|do not recommend)[\.!]*$/i,
  /^n\/a$/i,
  /^(no comment|nothing|none|\.+|-+)$/i,
];

function isGenericText(text: string): boolean {
  const trimmed = text.trim();
  return GENERIC_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/** A review is "valid" (information-dense) if it has substantive content */
function isValidReview(pr: ParsedReview): boolean {
  const text = pr.fullText.trim();
  // Must be > 20 chars and not a generic one-liner
  return text.length > 20 && !isGenericText(text);
}

interface ParsedReview {
  index: number;
  review: ReviewRecord;
  date: Date | null;
  fullText: string;
  ratings: Record<string, number>;
}

function parseAllReviews(reviews: ReviewRecord[]): ParsedReview[] {
  return reviews.map((r, index) => {
    let ratings: Record<string, number> = {};
    try { ratings = JSON.parse(r.ratingRaw); } catch { /* ignore */ }
    return {
      index,
      review: r,
      date: parseReviewDate(r.date),
      fullText: `${r.title ?? ""} ${r.text ?? ""}`,
      ratings,
    };
  });
}

/* ====================================
   Timeline bucketing
   ==================================== */

const RECENT_DAYS = 30;
const BUCKET_COUNT = 6;

function buildTimeline(
  parsed: ParsedReview[],
  keywords: string[],
  taggedIndices: Set<number>,
  negativeIndices: Set<number>,
  now: Date,
): TimelineEntry[] {
  const bucketSize = Math.ceil(RECENT_DAYS / BUCKET_COUNT);

  return Array.from({ length: BUCKET_COUNT }).map((_, idx) => {
    const startDay = RECENT_DAYS - (BUCKET_COUNT - idx) * bucketSize;
    const endDay = RECENT_DAYS - (BUCKET_COUNT - idx - 1) * bucketSize;

    const matching = parsed.filter((pr) => {
      if (!pr.date) return false;
      const age = daysBetween(now, pr.date);
      if (age < Math.max(0, startDay) || age >= endDay) return false;
      return taggedIndices.has(pr.index) || includesAnyKeyword(pr.fullText, keywords);
    });

    return {
      bucket: `${Math.max(0, startDay)}-${endDay}d`,
      mentions: matching.length,
      negativeMentions: matching.filter((pr) => negativeIndices.has(pr.index)).length,
    };
  });
}

/* ====================================
   Trend & status
   ==================================== */

function inferTrend(timeline: TimelineEntry[]): TrendDirection {
  const mid = Math.floor(timeline.length / 2);
  const a = timeline.slice(0, mid).reduce((s, e) => s + e.mentions, 0);
  const b = timeline.slice(mid).reduce((s, e) => s + e.mentions, 0);
  if (b >= a + 2) return "up";
  if (a >= b + 2) return "down";
  return "stable";
}

/* ====================================
   Topic volatility — not all info decays at the same rate
   ==================================== */

const STATIC_KEYWORDS = [
  "location", "neighborhood", "neighbourhood", "nearby", "area",
  "surroundings", "layout", "attractions", "distance", "transport",
  "convenience_of_location", "convenienceoflocation",
];

/** Classify a dimension key/label as dynamic or static */
function classifyVolatility(key: string, label: string): TopicVolatility {
  const lower = `${key} ${label}`.toLowerCase();
  if (STATIC_KEYWORDS.some((kw) => lower.includes(kw))) return "static";
  return "dynamic";
}

function summarizeStatus(args: {
  totalMentions: number;
  recentMentions30d: number;
  staleDays: number | null;
  negativeShare: number;
  staleAfterDays: number;
  volatility: TopicVolatility;
}): { status: HealthStatus; refreshReason: string } {
  const { totalMentions, recentMentions30d, staleDays, negativeShare, staleAfterDays, volatility } = args;

  if (totalMentions === 0)
    return { status: "unknown", refreshReason: "No review evidence found for this dimension." };

  // Static topics (location, neighborhood, etc.) don't need frequent updates
  if (volatility === "static") {
    if (negativeShare >= 0.45 && recentMentions30d > 0)
      return { status: "risk", refreshReason: "Recent mentions skew negative — unusual for a stable attribute." };
    if (totalMentions >= 2)
      return { status: "stable", refreshReason: "This attribute rarely changes and has consistent coverage across reviews." };
    return { status: "stable", refreshReason: "Low change risk — this attribute is unlikely to vary over time." };
  }

  // Dynamic topics — original time-sensitive logic
  if (negativeShare >= 0.45 && recentMentions30d > 0)
    return { status: "risk", refreshReason: "Recent mentions skew negative and should be refreshed with current guest feedback." };
  if (recentMentions30d >= 4)
    return { status: "strong_signal", refreshReason: "Recent review coverage is strong." };
  if ((staleDays ?? 999) > staleAfterDays || recentMentions30d === 0)
    return { status: "fading", refreshReason: "This topic appears stale because recent mentions are missing." };
  return { status: "stable", refreshReason: "There is some recent coverage, but not enough to be highly confident." };
}

/* ====================================
   Gap score — coverage + recency + volatility
   ==================================== */

function computeGapScore(args: {
  mentions: number;
  validReviewCount: number;
  staleDays: number | null;
  volatility: TopicVolatility;
  recencyThresholdDays?: number;
}): number {
  const { mentions, validReviewCount, staleDays, volatility, recencyThresholdDays = 30 } = args;

  // 1. Coverage: mentions / valid reviews
  const coverage = validReviewCount > 0 ? Math.min(mentions / validReviewCount, 1) : 0;

  // 2. Recency decay: how stale is the last mention
  const recencyScore = staleDays !== null
    ? Math.min(staleDays / recencyThresholdDays, 1)
    : 1; // no mention at all = fully stale

  // 3. Volatility weight
  const volatilityWeight = volatility === "dynamic" ? 1.0 : 0.2;

  // Weighted gap score
  const gapScore =
    (1 - coverage) * 0.4 +
    recencyScore * 0.4 +
    volatilityWeight * 0.2;

  return Math.round(Math.min(gapScore, 1) * 100) / 100;
}

/** Should we ask a follow-up for this dimension? */
function shouldAskDimension(gapScore: number, volatility: TopicVolatility): boolean {
  if (volatility === "static") return false;
  return gapScore > 0.6;
}

/* ====================================
   Dimension analysis
   ==================================== */

function analyzeDimension(
  dim: DiscoveredDimension,
  parsed: ParsedReview[],
  tags: ReviewDimensionTag[],
  now: Date,
  validReviewCount: number,
): DimensionHealth {

  const taggedIndices = new Set<number>();
  const negativeIndices = new Set<number>();

  for (const tag of tags) {
    for (const dt of tag.dimensions) {
      if (dt.key === dim.key) {
        taggedIndices.add(tag.reviewIndex);
        if (dt.sentiment === "negative" || dt.sentiment === "mixed") {
          negativeIndices.add(tag.reviewIndex);
        }
      }
    }
  }

  // Keyword fallback for reviews the AI might have missed
  for (const pr of parsed) {
    if (!taggedIndices.has(pr.index) && includesAnyKeyword(pr.fullText, dim.keywords)) {
      taggedIndices.add(pr.index);
    }
  }

  const relevantReviews = parsed.filter((pr) => taggedIndices.has(pr.index));
  const recentReviews30d = relevantReviews.filter(
    (pr) => pr.date && daysBetween(now, pr.date) <= RECENT_DAYS,
  );

  const datedRelevant = relevantReviews
    .filter((pr): pr is ParsedReview & { date: Date } => pr.date !== null)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  const staleDays = datedRelevant[0]?.date ? daysBetween(now, datedRelevant[0].date) : null;

  const ratingValues = relevantReviews
    .map((pr) => (pr.ratings["overall"] > 0 ? pr.ratings["overall"] : null))
    .filter((v): v is number => v !== null);
  const avgRating = ratingValues.length > 0
    ? Math.round((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length) * 100) / 100
    : null;

  const negativeCount = relevantReviews.filter((pr) => {
    if (negativeIndices.has(pr.index)) return true;
    const overall = pr.ratings["overall"];
    return overall > 0 && overall <= 2;
  }).length;
  const negativeShare = relevantReviews.length > 0 ? negativeCount / relevantReviews.length : 0;

  const volatility = classifyVolatility(dim.key, dim.label);

  // Compute gap score
  const gapScore = computeGapScore({
    mentions: relevantReviews.length,
    validReviewCount,
    staleDays,
    volatility,
  });

    const timeline = buildTimeline(parsed, dim.keywords, taggedIndices, negativeIndices, now);
  const trend = inferTrend(timeline);
  const { status, refreshReason } = summarizeStatus({
    totalMentions: relevantReviews.length,
    recentMentions30d: recentReviews30d.length,
    staleDays,
    negativeShare,
    staleAfterDays: dim.staleAfterDays,
    volatility,
  });

  const confidenceBase =
    Math.min(relevantReviews.length / 6, 1) * 0.5 +
    Math.min(recentReviews30d.length / 4, 1) * 0.35 +
    (taggedIndices.size > 0 ? 0.15 : 0);
  const confidence = Math.round(Math.min(confidenceBase, 0.98) * 100) / 100;

  let score = 0;
  if (status === "unknown") score += 0.95;
  if (status === "fading") score += 0.8;
  if (status === "risk") score += 0.75;
  if (recentReviews30d.length === 0) score += 0.2;
  score = Math.round(Math.min(score, 1.5) * 100) / 100;

  const summary = (() => {
    if (relevantReviews.length === 0)
      return `No guest feedback found for ${dim.label.toLowerCase()}.`;
    if (volatility === "static")
      return `${dim.label} is a stable attribute — consistent across reviews and unlikely to change.`;
    if (negativeShare >= 0.45 && recentReviews30d.length > 0)
      return `Recent ${dim.label.toLowerCase()} feedback skews negative (${Math.round(negativeShare * 100)}% mixed/negative).`;
    if (recentReviews30d.length >= 4)
      return `${dim.label} has strong recent coverage with ${recentReviews30d.length} mentions in the last 30 days.`;
    if (recentReviews30d.length > 0)
      return `${dim.label} has some recent signal (${recentReviews30d.length} mention${recentReviews30d.length > 1 ? "s" : ""} in 30d), but could use more.`;
    // No recent mentions — vary the message based on total count and avg rating
    const ratingNote = avgRating !== null ? ` (avg ${avgRating}/5)` : "";
    if (relevantReviews.length >= 10)
      return `${relevantReviews.length} historical mentions${ratingNote}, but none in recent reviews.`;
    return `Only ${relevantReviews.length} mention${relevantReviews.length > 1 ? "s" : ""} found${ratingNote} — limited signal overall.`;
  })();

  return {
    dimension: dim.key,
    label: dim.label,
    status,
    volatility,
    trend,
    confidence,
    score,
    gapScore,
    totalMentions: relevantReviews.length,
    validMentions: relevantReviews.filter((pr) => isValidReview(pr)).length,
    recentMentions30d: recentReviews30d.length,
    staleDays,
    negativeShare: Math.round(negativeShare * 100) / 100,
    avgRating,
    timeline,
    summary,
    refreshReason,
    questionCandidates: [],
  };
}

/* ====================================
   Fallback questions
   ==================================== */

function buildFallbackQuestions(
  cards: DimensionHealth[],
  dims: DiscoveredDimension[],
  max: number,
): SuggestedQuestion[] {
  const dimMap = new Map(dims.map((d) => [d.key, d]));
  return [...cards]
    .sort((a, b) => b.gapScore - a.gapScore)
    .slice(0, max)
    .map((card, idx) => {
      const dim = dimMap.get(card.dimension);
      return {
        dimension: card.dimension,
        question: `How was the ${card.label.toLowerCase()} during your stay?`,
        why: dim?.description ?? `${card.label} signal is weak or outdated.`,
        answerType: "text" as const,
        priority: idx + 1,
      };
    });
}

/* ====================================
   Main entry - 3-step adaptive pipeline
   ==================================== */

export async function computeKnowledgeHealth(
  hotel: HotelRecord,
  reviews: ReviewRecord[],
): Promise<KnowledgeHealthResponse> {
  const parsed = parseAllReviews(reviews);

  // Step 1: Discover dimensions from reviews (AI)
  const discoveredDims = await discoverDimensions(hotel, reviews);

  // Step 2: Tag reviews to dimensions (AI)
  const reviewTags = await tagReviewsDimensions(discoveredDims, reviews);

  // Use the latest review date as "now" so stale-days are relative to the dataset
  const allDates = parsed
    .map((pr) => pr.date)
    .filter((d): d is Date => d !== null);
  const now = allDates.length > 0
    ? new Date(Math.max(...allDates.map((d) => d.getTime())))
    : new Date();

  // Count valid (information-dense) reviews
  const validReviewCount = parsed.filter((pr) => isValidReview(pr)).length;

  // Step 3: Compute signals per dimension
  const dimensions = discoveredDims.map((dim) =>
    analyzeDimension(dim, parsed, reviewTags, now, validReviewCount),
  );

  const statusWeights: Record<HealthStatus, number> = {
    strong_signal: 100, stable: 65, fading: 25, risk: 15, unknown: 0,
  };
  const overallScore = Math.round(
    dimensions.reduce((s, d) => s + statusWeights[d.status], 0) / dimensions.length,
  );

  const maxQuestions = 2;
  // Only generate questions for dimensions where shouldAsk returns true
  const askableDimensions = dimensions.filter((d) => shouldAskDimension(d.gapScore, d.volatility));
  const fallbackQuestions = buildFallbackQuestions(
    askableDimensions.length > 0 ? askableDimensions : dimensions,
    discoveredDims,
    maxQuestions,
  );

  // Step 3b: AI refines questions
  const aiResult = await refineHealthWithAI({
    hotel,
    reviews,
    cards: dimensions,
    fallbackQuestions,
    maxQuestions,
    dimensionKeys: discoveredDims.map((d) => d.key),
  });

  for (const q of aiResult.questions) {
    const dim = dimensions.find((d) => d.dimension === q.dimension);
    if (dim && !dim.questionCandidates.includes(q.question)) {
      dim.questionCandidates.push(q.question);
    }
  }

  return {
    hotelId: hotel.id,
    dimensions,
    suggestedQuestions: aiResult.questions,
    aiSummary: aiResult.aiSummary,
    overallScore,
    reviewCount: reviews.length,
    generatedAt: new Date().toISOString(),
  };
}