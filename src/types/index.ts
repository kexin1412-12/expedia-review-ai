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
