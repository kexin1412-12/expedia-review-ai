export interface HotelRecord {
  id: string;
  name: string;
  city: string | null;
  province: string | null;
  country: string | null;
  rating: number | null;
  starRating: number | null;
  description: string;
  areaDescription: string;
  amenities: string[];
  reviewCount: number;
}

export interface ReviewRecord {
  id: string;
  date: string;
  title: string | null;
  text: string;
  ratingRaw: string;
  source: "seed" | "user";
}

export interface FollowUpResponse {
  topic: string;
  question: string;
  rationale: string;
  quickReplies: string[];
}

export interface HotelSummaryResponse {
  summary: string;
  highlights: string[];
}

/* ───── Property Knowledge Health ───── */

export type CoverageStatus =
  | "WELL COVERED"
  | "MEDIUM COVERAGE"
  | "LOW RECENT COVERAGE"
  | "STALE"
  | "UNCERTAIN";

export type TrendDirection = "improving" | "stable" | "declining" | "unknown";

export interface TimelineEntry {
  month: string;          // e.g. "2023-02"
  mentionCount: number;
  avgScore: number | null; // null when no structured score
}

export interface DimensionHealth {
  dimension: string;       // e.g. "Cleanliness"
  coverage: CoverageStatus;
  trend: TrendDirection;
  timeline: TimelineEntry[];
  questionCandidates: string[];
  summary: string;
  mentionCount: number;
  recentMentionCount: number;
  avgScore: number | null;
}

export interface KnowledgeHealthResponse {
  hotelId: string;
  dimensions: DimensionHealth[];
  dynamicFollowUps: FollowUpResponse[];
  overallScore: number;   // 0-100
  generatedAt: string;    // ISO timestamp
}
