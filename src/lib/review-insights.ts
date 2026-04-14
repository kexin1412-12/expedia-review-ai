import { ReviewRecord } from "@/types";

const stopWords = new Set([
  "about",
  "after",
  "again",
  "along",
  "also",
  "although",
  "always",
  "among",
  "and",
  "area",
  "around",
  "because",
  "been",
  "before",
  "being",
  "both",
  "could",
  "did",
  "does",
  "during",
  "from",
  "good",
  "great",
  "guests",
  "have",
  "hotel",
  "into",
  "just",
  "location",
  "more",
  "much",
  "only",
  "other",
  "our",
  "over",
  "place",
  "really",
  "room",
  "rooms",
  "said",
  "some",
  "stay",
  "stayed",
  "still",
  "than",
  "that",
  "their",
  "them",
  "there",
  "they",
  "this",
  "very",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "would",
  "your",
]);

type ParsedRating = {
  overall: number | null;
};

export type ReviewKeyword = {
  label: string;
  count: number;
};

export function parseReviewRating(review: ReviewRecord): ParsedRating {
  try {
    const parsed = JSON.parse(review.ratingRaw) as { overall?: number };
    return { overall: typeof parsed.overall === "number" && parsed.overall > 0 ? parsed.overall : null };
  } catch {
    return { overall: null };
  }
}

export function reviewStarBucket(review: ReviewRecord) {
  const rating = parseReviewRating(review).overall;
  if (!rating) return null;
  return Math.max(1, Math.min(5, Math.round(rating)));
}

export function extractTopKeywords(reviews: ReviewRecord[], max = 6): ReviewKeyword[] {
  const keywordCounts = new Map<string, number>();

  for (const review of reviews) {
    const matches = review.text.toLowerCase().match(/[a-z]{4,}/g) ?? [];
    const seen = new Set<string>();

    for (const match of matches) {
      if (stopWords.has(match) || seen.has(match)) continue;
      seen.add(match);
      keywordCounts.set(match, (keywordCounts.get(match) ?? 0) + 1);
    }
  }

  return Array.from(keywordCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, max)
    .map(([label, count]) => ({ label, count }));
}

export function getRatingDistribution(reviews: ReviewRecord[]) {
  const buckets = new Map<number, number>([
    [5, 0],
    [4, 0],
    [3, 0],
    [2, 0],
    [1, 0],
  ]);

  for (const review of reviews) {
    const bucket = reviewStarBucket(review);
    if (!bucket) continue;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([stars, count]) => ({ stars, count }));
}

function parseReviewDate(review: ReviewRecord) {
  if (review.source === "user") {
    const timestamp = Number(review.id.replace("user-", ""));
    if (Number.isFinite(timestamp)) return timestamp;
  }

  const parsed = Date.parse(review.date);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function sortReviews(reviews: ReviewRecord[], mode: "recent" | "top-rated" | "detailed") {
  const sorted = [...reviews];

  sorted.sort((left, right) => {
    if (mode === "top-rated") {
      const leftRating = parseReviewRating(left).overall ?? 0;
      const rightRating = parseReviewRating(right).overall ?? 0;
      return rightRating - leftRating || parseReviewDate(right) - parseReviewDate(left);
    }

    if (mode === "detailed") {
      return right.text.length - left.text.length || parseReviewDate(right) - parseReviewDate(left);
    }

    return parseReviewDate(right) - parseReviewDate(left);
  });

  return sorted;
}