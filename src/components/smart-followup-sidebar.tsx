"use client";

import { useState, useCallback, useEffect } from "react";
import { Mic, Send, RotateCcw, Edit2 } from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import {
  getWebSpeechLanguageCode,
  isSpeechRecognitionSupported,
} from "@/lib/language-utils";
import { FollowUpResponse } from "@/types";

export interface SmartFollowupSidebarProps {
  followUpData: FollowUpResponse | null;
  hotelLanguages?: string[];
  isLoading?: boolean;
  onSubmitAnswer: (answer: string) => Promise<void>;
}

type InsightState = {
  status: "idle" | "loading" | "loaded" | "error";
  transcript: string;
  sentiment?: string;
  insight?: string;
  error?: string;
};

export function SmartFollowupSidebar({
  followUpData,
  hotelLanguages,
  isLoading = false,
  onSubmitAnswer,
}: SmartFollowupSidebarProps) {
  const [inputMode, setInputMode] = useState<"quick" | "text" | "voice">(
    "quick"
  );
  const [textInput, setTextInput] = useState("");
  const [selectedQuickReply, setSelectedQuickReply] = useState<string | null>(
    null
  );
  const [insightState, setInsightState] = useState<InsightState>({
    status: "idle",
    transcript: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  // Check for speech recognition support on client side only
  useEffect(() => {
    setVoiceSupported(isSpeechRecognitionSupported());
  }, []);

  const language = getWebSpeechLanguageCode(hotelLanguages);

  const {
    isListening,
    transcript,
    error: voiceError,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceInput({
    language,
    onTranscript: (text) => setInsightState((prev) => ({ ...prev, transcript: text })),
    onError: (err) =>
      setInsightState((prev) => ({
        ...prev,
        status: "error",
        error: err,
        transcript: "",
      })),
  });

  const handleQuickReplyClick = useCallback(
    async (reply: string) => {
      setSelectedQuickReply(reply);
      setInputMode("quick");
      await extractAndShowInsight(reply);
    },
    []
  );

  const handleTextSubmit = useCallback(async () => {
    if (!textInput.trim()) return;
    await extractAndShowInsight(textInput);
  }, [textInput]);

  const handleVoiceSubmit = useCallback(async () => {
    if (!transcript.trim()) return;
    stopListening();
    await extractAndShowInsight(transcript);
  }, [transcript, stopListening]);

  const extractAndShowInsight = async (answer: string) => {
    setInsightState((prev) => ({ ...prev, status: "loading" }));

    try {
      const response = await fetch("/api/ai/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: followUpData?.topic,
          answer,
        }),
      });

      if (!response.ok) throw new Error("Failed to extract insight");

      const data = await response.json();
      setInsightState((prev) => ({
        ...prev,
        status: "loaded",
        sentiment: data.sentiment,
        insight: data.insight,
        transcript: answer,
      }));
    } catch (err) {
      setInsightState((prev) => ({
        ...prev,
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  };

  const handleConfirmAnswer = useCallback(async () => {
    if (!insightState.transcript) return;

    setIsSubmitting(true);
    try {
      await onSubmitAnswer(insightState.transcript);
      // Reset state after successful submission
      setTextInput("");
      setSelectedQuickReply(null);
      setInsightState({ status: "idle", transcript: "" });
      resetTranscript();
    } catch (err) {
      console.error("Failed to submit answer:", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [insightState.transcript, onSubmitAnswer, resetTranscript]);

  const handleTryAgain = useCallback(() => {
    setInsightState({ status: "idle", transcript: "" });
    resetTranscript();
  }, [resetTranscript]);

  // Show loading state
  if (isLoading || !followUpData) {
    return (
      <div className="w-full max-w-sm bg-gradient-to-b from-blue-50 to-white rounded-lg border border-blue-200 p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
      </div>
    );
  }

  // Show insight card if insights were extracted
  if (insightState.status === "loaded") {
    return (
      <div className="w-full max-w-sm bg-white rounded-lg border border-green-200 p-4 space-y-3">
        <div className="bg-green-50 rounded-lg p-3 border border-green-100">
          <p className="text-xs text-gray-600 font-medium mb-2">You said:</p>
          <p className="text-sm text-gray-800 italic">
            "{insightState.transcript}"
          </p>
        </div>

        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
          <p className="text-xs text-gray-600 font-medium mb-2">
            AI understood:
          </p>
          <div className="space-y-1">
            {insightState.sentiment && (
              <p className="text-xs text-gray-700">
                <span className="font-medium">Sentiment:</span>{" "}
                <span className="capitalize">{insightState.sentiment}</span>
              </p>
            )}
            {insightState.insight && (
              <p className="text-xs text-gray-700">
                <span className="font-medium">Insight:</span>{" "}
                {insightState.insight}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleConfirmAnswer}
            disabled={isSubmitting}
            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium disabled:opacity-50 transition"
          >
            {isSubmitting ? "Submitting..." : "Use this answer"}
          </button>
          <button
            onClick={handleTryAgain}
            disabled={isSubmitting}
            className="flex-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm rounded-lg font-medium disabled:opacity-50 transition flex items-center justify-center gap-1"
          >
            <RotateCcw size={14} />
            <span>Try again</span>
          </button>
        </div>
      </div>
    );
  }

  // Show simplified input if no follow-up data (API error or loading)
  if (!followUpData) {
    return (
      <div className="w-full max-w-sm bg-gradient-to-b from-blue-50 to-white rounded-lg border border-blue-200 p-4 space-y-4">
        <div>
          <p className="text-xs font-semibold text-blue-600 uppercase mb-2">
            {isLoading ? "Loading..." : "Quick Input"}
          </p>
          <p className="text-sm text-gray-700">
            {isLoading
              ? "Getting suggestions..."
              : "Share your thoughts about this hotel"}
          </p>
        </div>

        {/* Simplified input: just voice and text */}
        <div className="space-y-2">
          {/* Text input */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-600 uppercase">
              Add details
            </p>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your comment..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              <button
                onClick={handleTextSubmit}
                disabled={!textInput.trim() || isLoading}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition"
              >
                <Send size={16} />
              </button>
            </div>
          </div>

          {/* Voice input */}
          {voiceSupported && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-600 uppercase">
                Or speak
              </p>
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isLoading}
                className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                  isListening
                    ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                    : "bg-white border border-gray-300 text-gray-800 hover:bg-gray-50"
                } disabled:opacity-50`}
              >
                <Mic size={16} />
                <span>{isListening ? "Listening..." : "Speak now"}</span>
              </button>
              {transcript && (
                <p className="text-xs text-gray-600 italic">
                  "... {transcript.slice(-50)}"
                </p>
              )}
              {isListening && (
                <button
                  onClick={handleVoiceSubmit}
                  disabled={!transcript.trim()}
                  className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium disabled:opacity-50 transition flex items-center justify-center gap-1"
                >
                  <Send size={14} />
                  <span>Submit</span>
                </button>
              )}
            </div>
          )}

          {!voiceSupported && (
            <p className="text-xs text-gray-500 italic">
              Voice input not supported in this browser
            </p>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
          </div>
        )}
      </div>
    );
  }
  if (insightState.status === "loaded") {
    return (
      <div className="w-full max-w-sm bg-white rounded-lg border border-green-200 p-4 space-y-3">
        <div className="bg-green-50 rounded-lg p-3 border border-green-100">
          <p className="text-xs text-gray-600 font-medium mb-2">You said:</p>
          <p className="text-sm text-gray-800 italic">
            "{insightState.transcript}"
          </p>
        </div>

        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
          <p className="text-xs text-gray-600 font-medium mb-2">
            AI understood:
          </p>
          <div className="space-y-1">
            {insightState.sentiment && (
              <p className="text-xs text-gray-700">
                <span className="font-medium">Sentiment:</span>{" "}
                <span className="capitalize">{insightState.sentiment}</span>
              </p>
            )}
            {insightState.insight && (
              <p className="text-xs text-gray-700">
                <span className="font-medium">Insight:</span>{" "}
                {insightState.insight}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleConfirmAnswer}
            disabled={isSubmitting}
            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium disabled:opacity-50 transition"
          >
            {isSubmitting ? "Submitting..." : "Use this answer"}
          </button>
          <button
            onClick={handleTryAgain}
            disabled={isSubmitting}
            className="flex-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm rounded-lg font-medium disabled:opacity-50 transition flex items-center justify-center gap-1"
          >
            <RotateCcw size={14} />
            <span>Try again</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm bg-gradient-to-b from-blue-50 to-white rounded-lg border border-blue-200 p-4 space-y-4">
      {/* Question */}
      <div>
        <p className="text-xs font-semibold text-blue-600 uppercase letters-wide mb-2">
          Smart Question
        </p>
        <p className="text-sm font-medium text-gray-900">
          {followUpData.question}
        </p>
        {followUpData.rationale && (
          <p className="text-xs text-gray-600 mt-1 italic">
            {followUpData.rationale}
          </p>
        )}
      </div>

      {/* Error state */}
      {insightState.status === "error" && (
        <div className="bg-red-50 border border-red-200 rounded p-2">
          <p className="text-xs text-red-700">
            {insightState.error || voiceError || "Something went wrong"}
          </p>
        </div>
      )}

      {/* Input modes */}
      <div className="space-y-2">
        {/* Quick Replies */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-600 uppercase">Quick</p>
          <div className="space-y-1.5">
            {followUpData.quickReplies?.map((reply) => (
              <button
                key={reply}
                onClick={() => handleQuickReplyClick(reply)}
                disabled={insightState.status === "loading"}
                className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition ${
                  selectedQuickReply === reply
                    ? "bg-blue-600 text-white border border-blue-700"
                    : "bg-white border border-gray-300 text-gray-800 hover:bg-gray-50"
                } disabled:opacity-50`}
              >
                {reply}
              </button>
            ))}
          </div>
        </div>

        {/* Custom text input */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-600 uppercase">
            Or add details
          </p>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your answer..."
              disabled={insightState.status === "loading"}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <button
              onClick={handleTextSubmit}
              disabled={!textInput.trim() || insightState.status === "loading"}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition"
            >
              <Send size={16} />
            </button>
          </div>
        </div>

        {/* Voice input */}
        {voiceSupported && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-600 uppercase">Voice</p>
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={insightState.status === "loading"}
              className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                isListening
                  ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                  : "bg-white border border-gray-300 text-gray-800 hover:bg-gray-50"
              } disabled:opacity-50`}
            >
              <Mic size={16} />
              <span>{isListening ? "Listening..." : "Answer by voice"}</span>
            </button>
            {transcript && (
              <p className="text-xs text-gray-600 italic">
                "... {transcript.slice(-50)}"
              </p>
            )}
            {isListening && (
              <button
                onClick={handleVoiceSubmit}
                disabled={!transcript.trim()}
                className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium disabled:opacity-50 transition flex items-center justify-center gap-1"
              >
                <Send size={14} />
                <span>Submit</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {insightState.status === "loading" && (
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
          <span className="ml-2 text-xs text-gray-600">Processing...</span>
        </div>
      )}
    </div>
  );
}
