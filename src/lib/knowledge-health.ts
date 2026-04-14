import type {
  HotelRecord,
  ReviewRecord,
  HealthStatus,
  TrendDirection,
  TimelineEntry,
  DimensionHealth,
  DimensionKey,
  KnowledgeHealthResponse,
  SuggestedQuestion,
} from "@/types";
import { refineHealthWithAI } from "./ai";

/* ════════════════════════════════════════
   Dimension definitions
   ════════════════════════════════════════ */

interface DimensionDef {
  key: DimensionKey;
  label: string;
  ratingKey: string | null;
  keywords: string[];
  negativeKeywords: string[];
  propertyFields: string[];
  amenityHints: string[];
  importance: number;
  questionGoal: string;
}

const DIMENSIONS: DimensionDef[] = [
  {
    key: "cleanliness",
    label: "Cleanliness",
    ratingKey: "roomcleanliness",
    keywords: ["clean", "cleanliness", "dirty", "spotless", "bathroom", "housekeeping", "smell", "odor", "hygiene", "stain", "dust", "tidy", "messy", "mold"],
    negativeKeywords: ["dirty", "smelled", "odor", "stained", "filthy", "unclean", "mold", "messy"],
    propertyFields: ["description"],
    amenityHints: ["housekeeping"],
    importance: 0.9,
    questionGoal: "learn whether the room and bathroom condition is currently good",
  },
  {
    key: "service",
    label: "Service",
    ratingKey: "service",
    keywords: ["service", "staff", "front desk", "friendly", "helpful", "rude", "host", "support", "reception", "concierge", "attentive", "responsive", "professional"],
    negativeKeywords: ["rude", "slow", "unhelpful", "ignored", "bad service", "unresponsive"],
    propertyFields: ["description"],
    amenityHints: [],
    importance: 0.85,
    questionGoal: "learn whether staff service is currently smooth and helpful",
  },
  {
    key: "check_in",
    label: "Check-in",
    ratingKey: "checkin",
    keywords: ["check in", "check-in", "checkin", "late check in", "front desk", "arrival", "self check in", "key", "instructions", "line", "queue", "waiting"],
    negativeKeywords: ["long line", "confusing", "waited", "delay", "couldn't check in"],
    propertyFields: ["description"],
    amenityHints: ["frontdesk_24_hour"],
    importance: 0.95,
    questionGoal: "learn whether the check-in process is easy and current",
  },
  {
    key: "breakfast",
    label: "Breakfast",
    ratingKey: null,
    keywords: ["breakfast", "buffet", "food", "coffee", "restaurant", "morning meal", "cereal", "eggs", "continental", "brunch"],
    negativeKeywords: ["cold", "limited", "bad breakfast", "not fresh", "crowded", "poor breakfast"],
    propertyFields: ["description", "amenities"],
    amenityHints: ["breakfast_included", "breakfast_available"],
    importance: 0.7,
    questionGoal: "learn whether breakfast is currently offered and worth mentioning",
  },
  {
    key: "pool",
    label: "Pool",
    ratingKey: null,
    keywords: ["pool", "swimming", "swim", "jacuzzi", "hot tub", "waterslide"],
    negativeKeywords: ["closed", "dirty pool", "crowded", "broken", "cold pool"],
    propertyFields: ["amenities"],
    amenityHints: ["pool", "hot_tub"],
    importance: 0.6,
    questionGoal: "learn whether the pool is open and in good condition",
  },
  {
    key: "parking",
    label: "Parking",
    ratingKey: null,
    keywords: ["parking", "park", "garage", "valet", "car", "parked", "lot"],
    negativeKeywords: ["expensive", "limited", "no parking", "hard to park", "full"],
    propertyFields: ["description", "amenities"],
    amenityHints: ["free_parking"],
    importance: 0.75,
    questionGoal: "learn whether parking is easy, available, and accurate",
  },
  {
    key: "noise",
    label: "Noise",
    ratingKey: null,
    keywords: ["noise", "noisy", "quiet", "soundproof", "loud", "street noise", "neighbors", "thin wall", "traffic", "peaceful", "silent"],
    negativeKeywords: ["noisy", "loud", "thin walls", "could hear", "disturbing", "street noise"],
    propertyFields: ["description", "areaDescription"],
    amenityHints: ["soundproof_room"],
    importance: 0.8,
    questionGoal: "learn whether guests currently experience noise issues",
  },
  {
    key: "wifi",
    label: "Wi-Fi",
    ratingKey: null,
    keywords: ["wifi", "wi-fi", "internet", "connection", "signal", "online", "bandwidth", "wireless", "connectivity"],
    negativeKeywords: ["slow wifi", "unstable", "disconnect", "weak signal", "no internet", "poor wifi"],
    propertyFields: ["description", "amenities"],
    amenityHints: ["internet"],
    importance: 0.78,
    questionGoal: "learn whether the internet is currently reliable",
  },
];

/* ════════════════════════════════════════
   Utility helpers
   ════════════════════════════════════════ */

function normalizeText(input: string): string {
  return input.toLowerCase().replace(/\s+/g, " ").trim();
}

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

function includesAnyKeyword(text: string, keywords: string[]): boolean {
  const normalized = normalizeText(text);
  return keywords.some((kw) => normalized.includes(normalizeText(kw)));
}

function countNegativeSignals(text: string, negativeKeywords: string[]): number {
  const normalized = normalizeText(text);
  return negativeKeywords.reduce((sum, kw) => sum + (normalized.includes(normalizeText(kw)) ? 1 : 0), 0);
}

/* ════════════════════════════════════════
   Parsed reviews
   ════════════════════════════════════════ */

interface ParsedReview {
  review: ReviewRecord;
  date: Date | null;
  fullText: string;
  ratings: Record<string, number>;
}

function parseAllReviews(reviews: ReviewRecord[]): ParsedReview[] {
  return reviews.map((r) => {
    let ratings: Record<string, number> = {};
    try { ratings = JSON.parse(r.ratingRaw); } catch { /* ignore */ }
    return {
      review: r,
      date: parseReviewDate(r.date),
      fullText: `${r.title ?? ""} ${r.text ?? ""}`,
      ratings,
    };
  });
}

/* ════════════════════════════════════════
   Timeline bucketing
   ════════════════════════════════════════ */

const RECENT_DAYS = 30;
const BUCKET_COUNT = 6;

function buildTimeline(parsed: ParsedReview[], keywords: string[], negativeKeywords: string[]): TimelineEntry[] {
  const now = new Date();
  const bucketSize = Math.ceil(RECENT_DAYS / BUCKET_COUNT);

  return Array.from({ length: BUCKET_COUNT }).map((_, idx) => {
    const startDay = RECENT_DAYS - (BUCKET_COUNT - idx) * bucketSize;
    const endDay = RECENT_DAYS - (BUCKET_COUNT - idx - 1) * bucketSize;

    const matching = parsed.filter((pr) => {
      if (!pr.date) return false;
      const age = daysBetween(now, pr.date);
      return age >= Math.max(0, startDay) && age < endDay && includesAnyKeyword(pr.fullText, keywords);
    });

    return {
      bucket: `${Math.max(0, startDay)}-${endDay}d`,
      mentions: matching.length,
      negativeMentions: matching.filter((pr) => countNegativeSignals(pr.fullText, negativeKeywords) > 0).length,
    };
  });
}

/* ════════════════════════════════════════
   Property field coverage
   ════════════════════════════════════════ */

function checkPropertyFields(hotel: HotelRecord, fields: string[]): { hasInfo: boolean; covered: string[] } {
  const covered: string[] = [];
  for (const field of fields) {
    if (field === "amenities") {
      if (hotel.amenities.length > 0) covered.push("amenities");
    } else {
      const value = (hotel as unknown as Record<string, unknown>)[field];
      if (typeof value === "string" && value.trim().length > 0) covered.push(field);
    }
  }
  return { hasInfo: covered.length > 0, covered };
}

/* ════════════════════════════════════════
   Trend & status
   ════════════════════════════════════════ */

function inferTrend(timeline: TimelineEntry[]): TrendDirection {
  const mid = Math.floor(timeline.length / 2);
  const a = timeline.slice(0, mid).reduce((s, e) => s + e.mentions, 0);
  const b = timeline.slice(mid).reduce((s, e) => s + e.mentions, 0);
  if (b >= a + 2) return "up";
  if (a >= b + 2) return "down";
  return "stable";
}

function summarizeStatus(args: {
  totalMentions: number;
  recentMentions30d: number;
  staleDays: number | null;
  negativeShare: number;
}): { status: HealthStatus; refreshReason: string } {
  const { totalMentions, recentMentions30d, staleDays, negativeShare } = args;

  if (totalMentions === 0)
    return { status: "unknown", refreshReason: "No review evidence found for this dimension." };
  if (negativeShare >= 0.45 && recentMentions30d > 0)
    return { status: "risk", refreshReason: "Recent mentions skew negative and should be refreshed with current guest feedback." };
  if (recentMentions30d >= 4)
    return { status: "strong_signal", refreshReason: "Recent review coverage is strong." };
  if ((staleDays ?? 999) > 90 || recentMentions30d === 0)
    return { status: "fading", refreshReason: "This topic appears stale because recent mentions are missing." };
  return { status: "stable", refreshReason: "There is some recent coverage, but not enough to be highly confident." };
}

/* ════════════════════════════════════════
   Dimension analysis
   ════════════════════════════════════════ */

function analyzeDimension(dim: DimensionDef, parsed: ParsedReview[], hotel: HotelRecord): DimensionHealth {
  const now = new Date();

  const relevantReviews = parsed.filter((pr) => {
    if (dim.ratingKey && pr.ratings[dim.ratingKey] && pr.ratings[dim.ratingKey] > 0) return true;
    return includesAnyKeyword(pr.fullText, dim.keywords);
  });

  const recentReviews30d = relevantReviews.filter((pr) => pr.date && daysBetween(now, pr.date) <= RECENT_DAYS);

  const datedRelevant = relevantReviews
    .filter((pr): pr is ParsedReview & { date: Date } => pr.date !== null)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  const staleDays = datedRelevant[0]?.date ? daysBetween(now, datedRelevant[0].date) : null;

  const ratingValues = relevantReviews
    .map((pr) => (dim.ratingKey && pr.ratings[dim.ratingKey] > 0 ? pr.ratings[dim.ratingKey] : (pr.ratings["overall"] > 0 ? pr.ratings["overall"] : null)))
    .filter((v): v is number => v !== null);
  const avgRating = ratingValues.length > 0
    ? Math.round((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length) * 100) / 100
    : null;

  const negativeCount = relevantReviews.filter((pr) => {
    const hits = countNegativeSignals(pr.fullText, dim.negativeKeywords);
    const overall = pr.ratings["overall"];
    return hits > 0 || (overall > 0 && overall <= 2);
  }).length;
  const negativeShare = relevantReviews.length > 0 ? negativeCount / relevantReviews.length : 0;

  const timeline = buildTimeline(parsed, dim.keywords, dim.negativeKeywords);
  const trend = inferTrend(timeline);
  const propInfo = checkPropertyFields(hotel, dim.propertyFields);
  const { status, refreshReason } = summarizeStatus({
    totalMentions: relevantReviews.length,
    recentMentions30d: recentReviews30d.length,
    staleDays,
    negativeShare,
  });

  const confidenceBase =
    Math.min(relevantReviews.length / 6, 1) * 0.45 +
    Math.min(recentReviews30d.length / 4, 1) * 0.35 +
    (propInfo.hasInfo ? 0.2 : 0);
  const confidence = Math.round(Math.min(confidenceBase, 0.98) * 100) / 100;

  let score = 0;
  if (status === "unknown") score += 0.95;
  if (status === "fading") score += 0.8;
  if (status === "risk") score += 0.75;
  if (!propInfo.hasInfo) score += 0.25;
  if (recentReviews30d.length === 0) score += 0.2;
  score += dim.importance * 0.4;
  score = Math.round(Math.min(score, 1.5) * 100) / 100;

  const summary =
    relevantReviews.length === 0
      ? `Guests rarely mention ${dim.label.toLowerCase()}, so the system lacks signal.`
      : recentReviews30d.length === 0
        ? `${dim.label} is mentioned historically, but not in recent reviews.`
        : negativeShare >= 0.45
          ? `Recent ${dim.label.toLowerCase()} mentions show mixed or negative signals.`
          : `Recent guest feedback provides usable signal for ${dim.label.toLowerCase()}.`;

  return {
    dimension: dim.key, label: dim.label, status, trend, confidence, score,
    totalMentions: relevantReviews.length, recentMentions30d: recentReviews30d.length,
    staleDays, avgRating, timeline,
    propertyHasOfficialInfo: propInfo.hasInfo, propertyFieldCoverage: propInfo.covered,
    summary, refreshReason, questionCandidates: [],
  };
}

/* ════════════════════════════════════════
   Deterministic fallback questions
   ════════════════════════════════════════ */

const FALLBACK_Q: Record<DimensionKey, { question: string; why: string }> = {
  cleanliness: { question: "How clean was your room and bathroom?", why: "Cleanliness is high-value information and needs fresh signal." },
  service: { question: "How helpful and friendly was the staff?", why: "Service signal needs fresher guest feedback." },
  check_in: { question: "How was the check-in process when you arrived?", why: "Check-in information changes often and needs current confirmation." },
  breakfast: { question: "Was breakfast available during your stay, and how was it?", why: "Breakfast coverage is limited or outdated." },
  pool: { question: "Was the pool open and in good condition?", why: "Amenity status may be stale." },
  parking: { question: "Was parking easy to find and use?", why: "Guests need current parking details before booking." },
  noise: { question: "Was your room quiet at night?", why: "Noise conditions can vary over time and affect booking decisions." },
  wifi: { question: "How reliable was the Wi-Fi during your stay?", why: "Recent internet quality signal is weak or uncertain." },
};

function buildDeterministicQuestions(cards: DimensionHealth[], maxQuestions: number): SuggestedQuestion[] {
  return [...cards]
    .sort((a, b) => b.score - a.score)
    .slice(0, maxQuestions)
    .map((card, idx) => ({
      dimension: card.dimension,
      question: FALLBACK_Q[card.dimension].question,
      why: FALLBACK_Q[card.dimension].why,
      answerType: "text" as const,
      priority: idx + 1,
    }));
}

/* ════════════════════════════════════════
   Main entry
   ════════════════════════════════════════ */

export async function computeKnowledgeHealth(
  hotel: HotelRecord,
  reviews: ReviewRecord[],
): Promise<KnowledgeHealthResponse> {
  const parsed = parseAllReviews(reviews);
  const dimensions = DIMENSIONS.map((dim) => analyzeDimension(dim, parsed, hotel));

  const statusWeights: Record<HealthStatus, number> = {
    strong_signal: 100, stable: 65, fading: 25, risk: 15, unknown: 0,
  };
  const overallScore = Math.round(
    dimensions.reduce((s, d) => s + statusWeights[d.status], 0) / dimensions.length
  );

  const maxQuestions = 2;
  const fallbackQuestions = buildDeterministicQuestions(dimensions, maxQuestions);

  const aiResult = await refineHealthWithAI({ hotel, reviews, cards: dimensions, fallbackQuestions, maxQuestions });

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
