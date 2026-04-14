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

export type HealthStatus =
  | "strong_signal"
  | "stable"
  | "fading"
  | "risk"
  | "unknown";

export type TrendDirection = "up" | "down" | "stable";

export type DimensionKey =
  | "cleanliness"
  | "service"
  | "check_in"
  | "breakfast"
  | "pool"
  | "parking"
  | "noise"
  | "wifi";

export interface TimelineEntry {
  bucket: string;
  mentions: number;
  negativeMentions: number;
}

export interface DimensionHealth {
  dimension: DimensionKey;
  label: string;
  status: HealthStatus;
  trend: TrendDirection;
  confidence: number;         // 0-1
  score: number;              // priority score for gap detection
  totalMentions: number;
  recentMentions30d: number;
  staleDays: number | null;
  avgRating: number | null;
  timeline: TimelineEntry[];
  propertyHasOfficialInfo: boolean;
  propertyFieldCoverage: string[];
  summary: string;
  refreshReason: string;
  questionCandidates: string[];
}

export interface SuggestedQuestion {
  dimension: DimensionKey;
  question: string;
  why: string;
  answerType: "text" | "yes_no" | "choice";
  priority: number;
}

export interface KnowledgeHealthResponse {
  hotelId: string;
  dimensions: DimensionHealth[];
  suggestedQuestions: SuggestedQuestion[];
  aiSummary: string;
  overallScore: number;       // 0-100
  reviewCount: number;
  generatedAt: string;
}
