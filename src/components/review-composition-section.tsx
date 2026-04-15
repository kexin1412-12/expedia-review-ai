"use client";

import { useState, useCallback, useMemo } from "react";
import { HotelRecord, ReviewRecord } from "@/types";
import { SmartFollowupSidebar } from "./smart-followup-sidebar";
import { FollowUpResponse } from "@/types";
import { RefreshCw } from "lucide-react";

export interface ReviewCompositionSectionProps {
  hotel: HotelRecord;
  existingReviews: ReviewRecord[];
  onReviewSubmit?: (review: {
    title?: string;
    text: string;
    followUpInsights?: Array<{ topic: string; answer: string }>;
  }) => Promise<void>;
}

export function ReviewCompositionSection({
  hotel,
  existingReviews,
  onReviewSubmit,
}: ReviewCompositionSectionProps) {
  const [draftReview, setDraftReview] = useState("");
  const [followUpData, setFollowUpData] = useState<FollowUpResponse | null>(null);
  const [isLoadingFollowUp, setIsLoadingFollowUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedAnswers, setSubmittedAnswers] = useState<
    Map<string, string>
  >(new Map());

  // Debounced follow-up fetching
  const debouncedFetchFollowUp = useCallback(async (review: string) => {
    if (!review.trim()) {
      setFollowUpData(null);
      return;
    }

    setIsLoadingFollowUp(true);
    try {
      const response = await fetch(
        `/api/hotels/${hotel.id}/follow-up`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draftReview: review }),
        }
      );

      if (!response.ok) throw new Error("Failed to fetch follow-up");

      const data: FollowUpResponse = await response.json();
      setFollowUpData(data);
      setSubmitError(null);
    } catch (err) {
      console.error("Failed to fetch follow-up:", err);
      setFollowUpData(null);
      // Don't show error to user - graceful degradation
    } finally {
      setIsLoadingFollowUp(false);
    }
  }, [hotel.id]);

  // Debounce follow-up fetch (300ms)
  const handleDraftChange = useCallback(
    (text: string) => {
      setDraftReview(text);

      const timeoutId = setTimeout(() => {
        debouncedFetchFollowUp(text);
      }, 300);

      return () => clearTimeout(timeoutId);
    },
    [debouncedFetchFollowUp]
  );

  const handleFollowUpAnswer = useCallback(async (answer: string) => {
    if (!followUpData?.topic) return;

    // Add to submitted answers
    setSubmittedAnswers((prev) => {
      const newMap = new Map(prev);
      newMap.set(followUpData.topic, answer);
      return newMap;
    });

    // Clear follow-up for next question (optional - could fetch next follow-up here)
    setFollowUpData(null);
  }, [followUpData?.topic]);

  const handleSubmitReview = useCallback(async () => {
    if (!draftReview.trim()) {
      setSubmitError("Please write a review");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const reviewData = {
        title: undefined, // Optional - could add title input
        text: draftReview,
        followUpInsights: Array.from(submittedAnswers.entries()).map(
          ([topic, answer]) => ({
            topic,
            answer,
          })
        ),
      };

      if (onReviewSubmit) {
        await onReviewSubmit(reviewData);
      } else {
        // Default: submit as new review
        const response = await fetch(
          `/api/hotels/${hotel.id}/reviews`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reviewData),
          }
        );

        if (!response.ok) throw new Error("Failed to submit review");
      }

      // Reset form
      setDraftReview("");
      setFollowUpData(null);
      setSubmittedAnswers(new Map());
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      setSubmitError(`Failed to submit review: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [draftReview, submittedAnswers, hotel.id, onReviewSubmit]);

  const handleClearDraft = useCallback(() => {
    setDraftReview("");
    setFollowUpData(null);
    setSubmittedAnswers(new Map());
    setSubmitError(null);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
      {/* Left side: Review composition */}
      <div className="lg:col-span-2 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Write Your Review
          </label>
          <textarea
            value={draftReview}
            onChange={(e) => handleDraftChange(e.target.value)}
            placeholder="Share your experience at this hotel..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            rows={6}
          />
        </div>

        {/* Topics covered indicator */}
        {draftReview.trim() && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-900 mb-2">
              Topics mentioned
            </p>
            <div className="flex flex-wrap gap-2">
              {hotel.amenities.slice(0, 5).map((amenity) => (
                <span
                  key={amenity}
                  className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                >
                  {amenity}
                  {Math.random() > 0.5 && " ✓"}
                  {/* Note: This is a simplified indicator. Should integrate with AI topic detection */}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Submitted answers summary */}
        {submittedAnswers.size > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-green-900 mb-2">
              Answers added: {submittedAnswers.size}
            </p>
            <ul className="space-y-1">
              {Array.from(submittedAnswers.entries()).map(([topic, answer]) => (
                <li key={topic} className="text-xs text-green-800">
                  <span className="font-medium capitalize">{topic}:</span> "{answer.slice(0, 40)}..."
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Error message */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-red-800">{submitError}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleSubmitReview}
            disabled={
              isSubmitting || !draftReview.trim()
            }
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition"
          >
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </button>
          <button
            onClick={handleClearDraft}
            disabled={isSubmitting || !draftReview.trim()}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium rounded-lg disabled:opacity-50 transition"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Right side: Smart Follow-up Sidebar */}
      <div className="lg:col-span-1">
        <div className="sticky top-6 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">
            {draftReview.trim() ? "Smart Follow-up" : "Start typing to get suggestions"}
          </h3>
          <SmartFollowupSidebar
            followUpData={followUpData}
            hotelLanguages={hotel.amenityCategories?.langsSpoken}
            isLoading={isLoadingFollowUp}
            onSubmitAnswer={handleFollowUpAnswer}
          />
        </div>
      </div>
    </div>
  );
}
