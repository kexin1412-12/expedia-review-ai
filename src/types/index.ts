export interface AmenityCategories {
  accessibility: string[];
  activitiesNearby: string[];
  businessServices: string[];
  conveniences: string[];
  familyFriendly: string[];
  foodAndDrink: string[];
  guestServices: string[];
  internet: string[];
  langsSpoken: string[];
  more: string[];
  outdoor: string[];
  parking: string[];
  spa: string[];
  thingsToDo: string[];
}

export interface CheckInInfo {
  startTime: string | null;
  endTime: string | null;
  instructions: string[];
}

export interface CheckOutInfo {
  time: string | null;
  policy: string[];
}

export interface HotelPolicies {
  pet: string[];
  childrenAndExtraBed: string[];
  knowBeforeYouGo: string[];
}

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
  popularAmenities: string[];
  amenityCategories: AmenityCategories;
  checkIn: CheckInInfo;
  checkOut: CheckOutInfo;
  policies: HotelPolicies;
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

/** AI-discovered dimension (dynamic per property) */
export interface DiscoveredDimension {
  key: string;
  label: string;
  description: string;
  keywords: string[];
  staleAfterDays: number;
}

/** Per-review dimension tag from AI mapping */
export interface ReviewDimensionTag {
  reviewIndex: number;
  dimensions: {
    key: string;
    sentiment: "positive" | "negative" | "mixed" | "neutral";
    evidence: string;
  }[];
}

export interface TimelineEntry {
  bucket: string;
  mentions: number;
  negativeMentions: number;
}

export type TopicVolatility = "dynamic" | "static";

export interface DimensionHealth {
  dimension: string;
  label: string;
  status: HealthStatus;
  volatility: TopicVolatility;
  trend: TrendDirection;
  confidence: number;
  score: number;
  gapScore: number;
  totalMentions: number;
  validMentions: number;
  recentMentions30d: number;
  staleDays: number | null;
  negativeShare: number;
  avgRating: number | null;
  timeline: TimelineEntry[];
  summary: string;
  refreshReason: string;
  questionCandidates: string[];
}

export interface SuggestedQuestion {
  dimension: string;
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
  overallScore: number;
  reviewCount: number;
  generatedAt: string;
}
