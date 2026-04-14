import type {
  HotelRecord,
  ReviewRecord,
  CoverageStatus,
  TrendDirection,
  TimelineEntry,
  DimensionHealth,
  KnowledgeHealthResponse,
  FollowUpResponse,
} from "@/types";
import { generateHealthFollowUps } from "./ai";

/* ────────────────────────────────────────
   Dimension definitions
   ──────────────────────────────────────── */

interface DimensionDef {
  label: string;
  /** key inside ratingRaw JSON (null = text-only dimension) */
  ratingKey: string | null;
  /** keywords to search in review text (case-insensitive) */
  keywords: string[];
  /** amenity keywords – if hotel has the amenity, dimension is relevant */
  amenityHints: string[];
}

const DIMENSIONS: DimensionDef[] = [
  {
    label: "Cleanliness",
    ratingKey: "roomcleanliness",
    keywords: ["clean", "dirty", "filthy", "spotless", "hygiene", "sanitary", "stain", "dust", "tidy", "messy", "housekeeping", "mold"],
    amenityHints: ["housekeeping"],
  },
  {
    label: "Service",
    ratingKey: "service",
    keywords: ["staff", "service", "friendly", "helpful", "rude", "reception", "concierge", "attentive", "responsive", "professional"],
    amenityHints: [],
  },
  {
    label: "Check-in",
    ratingKey: "checkin",
    keywords: ["check-in", "checkin", "check in", "front desk", "arrival", "key", "waiting", "queue", "late check"],
    amenityHints: ["frontdesk_24_hour"],
  },
  {
    label: "Breakfast",
    ratingKey: null,
    keywords: ["breakfast", "morning meal", "buffet", "coffee", "cereal", "eggs", "continental", "brunch"],
    amenityHints: ["breakfast_included", "breakfast_available"],
  },
  {
    label: "Pool",
    ratingKey: null,
    keywords: ["pool", "swimming", "swim", "jacuzzi", "hot tub", "waterslide"],
    amenityHints: ["pool", "hot_tub"],
  },
  {
    label: "Parking",
    ratingKey: null,
    keywords: ["parking", "park", "garage", "valet", "car", "lot"],
    amenityHints: ["free_parking"],
  },
  {
    label: "Noise",
    ratingKey: null,
    keywords: ["noise", "noisy", "loud", "quiet", "soundproof", "thin wall", "neighbor", "traffic", "peaceful", "silent"],
    amenityHints: ["soundproof_room"],
  },
  {
    label: "Wi-Fi",
    ratingKey: null,
    keywords: ["wifi", "wi-fi", "internet", "connection", "bandwidth", "online", "wireless", "connectivity"],
    amenityHints: ["internet"],
  },
];

/* ────────────────────────────────────────
   Date helpers
   ──────────────────────────────────────── */

function parseReviewDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  // Format: M/D/YY
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  let year = parseInt(parts[2], 10);
  if (year < 100) year += 2000;
  if (isNaN(month) || isNaN(day) || isNaN(year)) return null;
  return new Date(year, month - 1, day);
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** How many days ago was this date? */
function daysAgo(d: Date): number {
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

/* ────────────────────────────────────────
   Scoring helpers
   ──────────────────────────────────────── */

interface ParsedReview {
  review: ReviewRecord;
  date: Date | null;
  textLower: string;
  ratings: Record<string, number>;
}

function parseReviews(reviews: ReviewRecord[]): ParsedReview[] {
  return reviews.map((r) => {
    let ratings: Record<string, number> = {};
    try {
      ratings = JSON.parse(r.ratingRaw);
    } catch { /* ignore */ }
    return {
      review: r,
      date: parseReviewDate(r.date),
      textLower: (r.text ?? "").toLowerCase(),
      ratings,
    };
  });
}

const RECENT_DAYS = 180; // 6 months

function analyzeDimension(
  dim: DimensionDef,
  parsed: ParsedReview[],
  hotelAmenities: string[],
): DimensionHealth {
  // 1. Find all reviews mentioning this dimension (text OR structured score)
  const mentions: { pr: ParsedReview; score: number | null }[] = [];

  for (const pr of parsed) {
    let mentioned = false;
    let score: number | null = null;

    // Check structured rating
    if (dim.ratingKey && pr.ratings[dim.ratingKey] && pr.ratings[dim.ratingKey] > 0) {
      mentioned = true;
      score = pr.ratings[dim.ratingKey];
    }

    // Check text keywords
    if (!mentioned) {
      for (const kw of dim.keywords) {
        if (pr.textLower.includes(kw)) {
          mentioned = true;
          break;
        }
      }
    }

    if (mentioned) {
      mentions.push({ pr, score });
    }
  }

  // 2. Split into recent vs. all
  const recentMentions = mentions.filter(
    (m) => m.pr.date && daysAgo(m.pr.date) <= RECENT_DAYS
  );

  // 3. Build timeline (group by month)
  const timelineMap = new Map<string, { count: number; scores: number[] }>();
  for (const m of mentions) {
    if (!m.pr.date) continue;
    const mk = monthKey(m.pr.date);
    const entry = timelineMap.get(mk) ?? { count: 0, scores: [] };
    entry.count++;
    if (m.score !== null) entry.scores.push(m.score);
    timelineMap.set(mk, entry);
  }

  const timeline: TimelineEntry[] = Array.from(timelineMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      mentionCount: data.count,
      avgScore: data.scores.length > 0
        ? Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 10) / 10
        : null,
    }));

  // 4. Avg score across all mentions with a score
  const allScores = mentions.map((m) => m.score).filter((s): s is number => s !== null);
  const avgScore = allScores.length > 0
    ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
    : null;

  // 5. Trend (compare first half vs second half of timeline)
  const trend = computeTrend(timeline);

  // 6. Coverage status
  const isRelevant =
    dim.amenityHints.length === 0 ||
    dim.amenityHints.some((h) => hotelAmenities.includes(h));

  const coverage = determineCoverage(
    mentions.length,
    recentMentions.length,
    parsed.length,
    isRelevant,
  );

  // 7. Summary sentence
  const summary = buildSummary(dim.label, mentions.length, recentMentions.length, avgScore, coverage, trend);

  return {
    dimension: dim.label,
    coverage,
    trend,
    timeline,
    questionCandidates: [], // filled later by OpenAI
    summary,
    mentionCount: mentions.length,
    recentMentionCount: recentMentions.length,
    avgScore,
  };
}

function computeTrend(timeline: TimelineEntry[]): TrendDirection {
  if (timeline.length < 2) return "unknown";
  const mid = Math.floor(timeline.length / 2);
  const firstHalf = timeline.slice(0, mid);
  const secondHalf = timeline.slice(mid);

  const avgCount = (entries: TimelineEntry[]) =>
    entries.reduce((s, e) => s + e.mentionCount, 0) / entries.length;

  const a = avgCount(firstHalf);
  const b = avgCount(secondHalf);

  if (b > a * 1.25) return "improving";
  if (b < a * 0.75) return "declining";
  return "stable";
}

function determineCoverage(
  total: number,
  recent: number,
  reviewCount: number,
  isRelevant: boolean,
): CoverageStatus {
  if (!isRelevant && total === 0) return "UNCERTAIN";

  const ratio = reviewCount > 0 ? total / reviewCount : 0;

  if (total === 0) return "UNCERTAIN";
  if (ratio >= 0.15 && recent >= 3) return "WELL COVERED";
  if (ratio >= 0.08 && recent >= 1) return "MEDIUM COVERAGE";
  if (total >= 3 && recent === 0) return "STALE";
  if (recent === 0) return "STALE";
  return "LOW RECENT COVERAGE";
}

function buildSummary(
  label: string,
  mentions: number,
  recent: number,
  avgScore: number | null,
  coverage: CoverageStatus,
  trend: TrendDirection,
): string {
  const scorePart = avgScore !== null ? ` with an average score of ${avgScore}/5` : "";

  if (coverage === "WELL COVERED") {
    return `${label} is well covered with ${mentions} mentions (${recent} recent)${scorePart}. Trend is ${trend}.`;
  }
  if (coverage === "STALE") {
    return `${label} has ${mentions} mentions but none in the last 6 months. Data may be outdated.`;
  }
  if (coverage === "UNCERTAIN") {
    return `${label} has very little or no coverage in reviews. More guest feedback is needed.`;
  }
  return `${label} has ${mentions} total mentions (${recent} recent)${scorePart}. Coverage is ${coverage.toLowerCase()}.`;
}

/* ────────────────────────────────────────
   Main entry
   ──────────────────────────────────────── */

export async function computeKnowledgeHealth(
  hotel: HotelRecord,
  reviews: ReviewRecord[],
): Promise<KnowledgeHealthResponse> {
  const parsed = parseReviews(reviews);

  // 1. Analyze each dimension
  const dimensions = DIMENSIONS.map((dim) =>
    analyzeDimension(dim, parsed, hotel.amenities)
  );

  // 2. Overall score: weighted average of dimension coverages
  const coverageWeights: Record<CoverageStatus, number> = {
    "WELL COVERED": 100,
    "MEDIUM COVERAGE": 65,
    "LOW RECENT COVERAGE": 35,
    "STALE": 15,
    "UNCERTAIN": 0,
  };
  const overallScore = Math.round(
    dimensions.reduce((s, d) => s + coverageWeights[d.coverage], 0) / dimensions.length
  );

  // 3. Identify gap dimensions (those not WELL COVERED) for AI follow-up
  const gapDimensions = dimensions.filter(
    (d) => d.coverage !== "WELL COVERED"
  );

  // 4. Call OpenAI for dynamic follow-ups & question candidates
  let dynamicFollowUps: FollowUpResponse[] = [];
  if (gapDimensions.length > 0) {
    const gapSignals = gapDimensions.map((d) => ({
      dimension: d.dimension,
      coverage: d.coverage,
      mentionCount: d.mentionCount,
      recentMentionCount: d.recentMentionCount,
      avgScore: d.avgScore,
    }));

    const aiResult = await generateHealthFollowUps(hotel, reviews, gapSignals);
    dynamicFollowUps = aiResult.followUps;

    // Attach question candidates back to dimensions
    for (const dq of aiResult.dimensionQuestions) {
      const dim = dimensions.find((d) => d.dimension === dq.dimension);
      if (dim) {
        dim.questionCandidates = dq.questions;
      }
    }
  }

  return {
    hotelId: hotel.id,
    dimensions,
    dynamicFollowUps,
    overallScore,
    generatedAt: new Date().toISOString(),
  };
}
