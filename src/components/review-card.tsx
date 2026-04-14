"use client";

import { ReviewRecord } from "@/types";
import { useState } from "react";

function formatReviewDate(value: string) {
  return value;
}

const RATING_LABELS: Record<string, string> = {
  roomcleanliness: "Room Cleanliness",
  service: "Service",
  roomcomfort: "Room Comfort",
  hotelcondition: "Hotel Condition",
  roomquality: "Room Quality",
  convenienceoflocation: "Location Convenience",
  neighborhoodsatisfaction: "Neighborhood",
  valueformoney: "Value for Money",
  roomamenitiesscore: "Room Amenities",
  communication: "Communication",
  ecofriendliness: "Eco-Friendliness",
  checkin: "Check-in",
  onlinelisting: "Online Listing",
  location: "Location",
};

function parseRatings(raw: string | undefined): { overall: number | null; details: { label: string; score: number }[] } {
  if (!raw) return { overall: null, details: [] };
  try {
    const obj = JSON.parse(raw);
    const overall = typeof obj.overall === "number" && obj.overall > 0 ? obj.overall : null;
    const details: { label: string; score: number }[] = [];
    for (const [key, val] of Object.entries(obj)) {
      if (key === "overall") continue;
      if (typeof val === "number" && val > 0) {
        details.push({ label: RATING_LABELS[key] || key, score: val });
      }
    }
    return { overall, details };
  } catch {
    return { overall: null, details: [] };
  }
}

function RatingStars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 20 20" className={`h-4 w-4 ${i < full ? "text-yellow-400" : i === full && half ? "text-yellow-400" : "text-slate-200"}`} fill="currentColor">
          {i === full && half ? (
            <>
              <defs><clipPath id={`half-${i}`}><rect x="0" y="0" width="10" height="20" /></clipPath></defs>
              <path clipPath={`url(#half-${i})`} d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              <path className="text-slate-200" fill="currentColor" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </>
          ) : (
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          )}
        </svg>
      ))}
      <span className="ml-1 text-sm font-semibold text-slate-700">{rating.toFixed(1)}</span>
    </div>
  );
}

export function ReviewCard({ review }: { review: ReviewRecord }) {
  const { overall, details } = parseRatings(review.ratingRaw);
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold text-slate-500">
            {review.source === "user" ? "Just added" : formatReviewDate(review.date)}
          </div>
          {overall !== null && <RatingStars rating={overall} />}
        </div>
        {review.source === "user" ? (
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-expediaBlue">New review</span>
        ) : null}
      </div>
      {review.title ? <h4 className="mt-2 text-lg font-semibold text-slate-900">{review.title}</h4> : null}
      <p className="mt-2 text-[15px] leading-7 text-slate-700">{review.text}</p>
      {details.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs font-medium text-expediaBlue hover:underline"
          >
            {showDetails ? "Hide rating details ▲" : "Show rating details ▼"}
          </button>
          {showDetails && (
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5">
              {details.map((d) => (
                <div key={d.label} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{d.label}</span>
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-yellow-400"
                        style={{ width: `${(d.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-xs font-medium text-slate-600">{d.score}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}