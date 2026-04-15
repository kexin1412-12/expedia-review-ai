"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { HotelRecord, ReviewRecord } from "@/types";
import { SmartFollowupSidebar } from "./smart-followup-sidebar";
import { FollowUpResponse } from "@/types";
import { Sparkles, CheckCircle2, Mic, MicOff } from "lucide-react";

export interface ReviewCompositionSectionProps {
  hotel: HotelRecord;
  existingReviews: ReviewRecord[];
  prefillQuestion?: { question: string; dimension: string } | null;
  onReviewSubmit?: (review: {
    title?: string;
    text: string;
    followUpInsights?: Array<{ topic: string; answer: string }>;
  }) => Promise<void>;
}

export function ReviewCompositionSection({
  hotel,
  existingReviews,
  prefillQuestion,
  onReviewSubmit,
}: ReviewCompositionSectionProps) {
  const [draftReview, setDraftReview] = useState("");
  const [followUpData, setFollowUpData] = useState<FollowUpResponse | null>(null);
  const [topicCovered, setTopicCovered] = useState(false);
  const [isLoadingFollowUp, setIsLoadingFollowUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedAnswers, setSubmittedAnswers] = useState<
    Map<string, string>
  >(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API for draft voice input
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let final = "";
        for (let i = 0; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += t;
          }
        }
        if (final) {
          setDraftReview((prev) => {
            const sep = prev && !prev.endsWith(" ") ? " " : "";
            return prev + sep + final;
          });
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  // Fetch follow-up when draft changes (debounced)
  const fetchFollowUp = useCallback(
    async (review: string, focusDimension?: string) => {
      if (!review.trim() || review.trim().length < 15) {
        if (!focusDimension) {
          setFollowUpData(null);
          return;
        }
      }

      setIsLoadingFollowUp(true);
      try {
        const answeredTopics = Array.from(submittedAnswers.keys());
        const response = await fetch(`/api/hotels/${hotel.id}/follow-up`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draftReview: review, focusDimension, answeredTopics }),
        });

        if (!response.ok) throw new Error("Failed to fetch follow-up");

        const data = await response.json();
        // AI determined topic already covered — show "covered" state
        if (data.skip) {
          setFollowUpData(null);
          setTopicCovered(true);
        } else {
          setFollowUpData(data as FollowUpResponse);
          setTopicCovered(false);
        }
        setSubmitError(null);
      } catch (err) {
        console.error("Failed to fetch follow-up:", err);
        setFollowUpData(null);
      } finally {
        setIsLoadingFollowUp(false);
      }
    },
    [hotel.id, submittedAnswers]
  );

  const handleDraftChange = useCallback(
    (text: string) => {
      setDraftReview(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchFollowUp(text);
      }, 800);
    },
    [fetchFollowUp]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Handle prefilled question from Knowledge Health panel
  useEffect(() => {
    if (prefillQuestion) {
      const prompt = `[Regarding ${prefillQuestion.dimension}] `;
      setDraftReview(prompt);
      // Trigger follow-up fetch with the dimension context
      fetchFollowUp(prompt, prefillQuestion.dimension);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillQuestion]);

  const toggleVoice = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setDraftReview((cur) => {
          fetchFollowUp(cur);
          return cur;
        });
      }, 400);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {}
    }
  }, [isListening, fetchFollowUp]);

  const handleFollowUpAnswer = useCallback(
    async (answer: string) => {
      if (!followUpData?.topic) return;

      setSubmittedAnswers((prev) => {
        const newMap = new Map(prev);
        newMap.set(followUpData.topic, answer);
        return newMap;
      });

      // Fetch next follow-up question
      setFollowUpData(null);
      if (draftReview.trim()) {
        setTimeout(() => fetchFollowUp(draftReview), 300);
      }
    },
    [followUpData?.topic, draftReview, fetchFollowUp]
  );

  const handleSubmitReview = useCallback(async () => {
    if (!draftReview.trim()) {
      setSubmitError("Please write a review first");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const reviewData = {
        title: undefined,
        text: draftReview,
        followUpInsights: Array.from(submittedAnswers.entries()).map(
          ([topic, answer]) => ({ topic, answer })
        ),
      };

      if (onReviewSubmit) {
        await onReviewSubmit(reviewData);
      } else {
        const response = await fetch(`/api/hotels/${hotel.id}/reviews`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reviewData),
        });
        if (!response.ok) throw new Error("Failed to submit review");
      }

      setSubmitted(true);
      setTimeout(() => {
        setDraftReview("");
        setFollowUpData(null);
        setSubmittedAnswers(new Map());
        setSubmitted(false);
      }, 3000);
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      setSubmitError(`Failed to submit: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [draftReview, submittedAnswers, hotel.id, onReviewSubmit]);

  // Success state
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
        <p className="text-lg font-semibold text-slate-900">
          Thank you for your review!
        </p>
        <p className="text-sm text-slate-500 mt-1">
          Your feedback helps other travelers and improves this property&apos;s knowledge.
        </p>
      </div>
    );
  }

  const hasContent = draftReview.trim().length > 0;
  const showFollowUp = hasContent || isLoadingFollowUp || followUpData !== null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* ── Left: Clean review input ── */}
      <div className="lg:col-span-3 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1.5">
            Write your review
          </label>
          <div className="relative">
            <textarea
              value={draftReview}
              onChange={(e) => handleDraftChange(e.target.value)}
              placeholder={isListening ? "Listening — speak now…" : "Share your experience at this hotel..."}
              className={`w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-slate-800 placeholder:text-slate-400 resize-none transition ${
                isListening ? "border-red-300 bg-red-50/30" : "border-slate-200"
              }`}
              rows={7}
            />
            {voiceSupported && (
              <button
                type="button"
                onClick={toggleVoice}
                className={`absolute right-3 bottom-3 p-2 rounded-full transition ${
                  isListening
                    ? "bg-red-500 text-white shadow-md animate-pulse"
                    : "bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-500"
                }`}
                title={isListening ? "Stop recording" : "Dictate your review"}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
          </div>
          {isListening && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              Recording — speak your review, then tap the mic to stop
            </p>
          )}
        </div>

        {/* Submitted follow-up answers */}
        {submittedAnswers.size > 0 && (
          <div className="flex flex-wrap gap-2">
            {Array.from(submittedAnswers.entries()).map(([topic, answer]) => (
              <div
                key={topic}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-800 capitalize">
                  {topic}
                </span>
                <span className="text-xs text-emerald-600">
                  — &ldquo;{answer.length > 30 ? answer.slice(0, 30) + "…" : answer}&rdquo;
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {submitError && (
          <p className="text-sm text-red-600">{submitError}</p>
        )}

        {/* Submit button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmitReview}
            disabled={isSubmitting || !hasContent}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition shadow-sm"
          >
            {isSubmitting ? "Submitting…" : "Submit review"}
          </button>
          {submittedAnswers.size > 0 && (
            <span className="text-xs text-slate-400">
              + {submittedAnswers.size} AI follow-up{submittedAnswers.size > 1 ? "s" : ""} attached
            </span>
          )}
        </div>
      </div>

      {/* ── Right: AI-guided follow-up ── */}
      <div className="lg:col-span-2">
        <div className="sticky top-6">
          {showFollowUp && !topicCovered ? (
            <SmartFollowupSidebar
              followUpData={followUpData}
              hotelLanguages={hotel.amenityCategories?.langsSpoken}
              isLoading={isLoadingFollowUp}
              onSubmitAnswer={handleFollowUpAnswer}
            />
          ) : topicCovered ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 text-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-emerald-800">
                Your review already covers this topic well
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                Keep writing — a new follow-up will appear if more detail would help
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
              <Sparkles className="h-8 w-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500">
                Start writing and AI will suggest
                <br />
                the most valuable follow-up question
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Based on what other reviews are missing
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
