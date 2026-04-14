import { ReviewRecord } from "@/types";
import { formatReviewDate } from "@/lib/hotel-display";

export function ReviewCard({ review }: { review: ReviewRecord }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-500">
          {review.source === "user" ? "Just added" : formatReviewDate(review.date)}
        </div>
        {review.source === "user" ? (
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-expediaBlue">New review</span>
        ) : null}
      </div>
      {review.title ? <h4 className="mt-2 text-lg font-semibold text-slate-900">{review.title}</h4> : null}
      <p className="mt-2 text-[15px] leading-7 text-slate-700">{review.text}</p>
    </div>
  );
}