"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Send, RotateCcw, Sparkles, Loader2, CheckCircle2, Pencil } from "lucide-react";
import { FollowUpResponse } from "@/types";

export interface SmartFollowupSidebarProps {
  followUpData: FollowUpResponse | null;
  hotelLanguages?: string[];
  isLoading?: boolean;
  onSubmitAnswer: (answer: string) => Promise<void>;
}

type Phase = "question" | "listening" | "preview" | "insight";

type InsightData = {
  sentiment?: string;
  insight?: string;
};

export function SmartFollowupSidebar({
  followUpData,
  hotelLanguages,
  isLoading = false,
  onSubmitAnswer,
}: SmartFollowupSidebarProps) {
  const [phase, setPhase] = useState<Phase>("question");
  const [textInput, setTextInput] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [insightData, setInsightData] = useState<InsightData>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);

  // Reset state when follow-up question changes
  useEffect(() => {
    setPhase("question");
    setTextInput("");
    setShowTextInput(false);
    setTranscript("");
    setInsightData({});
    setIsProcessing(false);
    setVoiceError(null);
  }, [followUpData?.topic]);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setVoiceSupported(true);
      recognitionRef.current = new SpeechRecognition();

      const recognition = recognitionRef.current;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let finalText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += t;
          }
        }
        const current = finalText || event.results[event.results.length - 1]?.[0]?.transcript || "";
        setTranscript(current);
      };

      recognition.onerror = (event: any) => {
        setVoiceError(`Microphone error: ${event.error}`);
        setPhase("question");
      };

      recognition.onend = () => {
        // Auto-transition to preview when voice stops
        setPhase((prev) => (prev === "listening" ? "preview" : prev));
      };
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  // ── Actions ──

  const handleQuickReply = async (reply: string) => {
    await processAnswer(reply);
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    await processAnswer(textInput.trim());
  };

  const startVoice = () => {
    if (!recognitionRef.current) return;
    setTranscript("");
    setVoiceError(null);
    setPhase("listening");
    try {
      recognitionRef.current.start();
    } catch {
      // already started
    }
  };

  const stopVoice = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
  };

  const handleUseVoiceAnswer = async () => {
    if (!transcript.trim()) return;
    await processAnswer(transcript.trim());
  };

  const handleEditVoice = () => {
    setTextInput(transcript);
    setShowTextInput(true);
    setPhase("question");
  };

  const processAnswer = async (answer: string) => {
    setIsProcessing(true);
    setPhase("insight");

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
      setInsightData({ sentiment: data.sentiment, insight: data.insight });
      setTranscript(answer);
    } catch {
      // On error, still proceed with the raw answer
      setTranscript(answer);
      setInsightData({});
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (!transcript) return;
    setIsSubmitting(true);
    try {
      await onSubmitAnswer(transcript);
      setPhase("question");
      setTextInput("");
      setShowTextInput(false);
      setTranscript("");
      setInsightData({});
    } catch (err) {
      console.error("Failed to submit:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setPhase("question");
    setTranscript("");
    setInsightData({});
    setVoiceError(null);
  };

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/80 to-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
            Analyzing your review…
          </span>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-3/4 bg-blue-100 rounded animate-pulse" />
          <div className="h-3 w-1/2 bg-blue-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  // ── No follow-up data yet (but user is typing) ──
  if (!followUpData) {
    return (
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/80 to-white p-5 text-center">
        <Sparkles className="h-6 w-6 text-blue-400 mx-auto mb-2" />
        <p className="text-sm text-slate-600">
          Keep writing — a smart follow-up will appear here
        </p>
      </div>
    );
  }

  // ── Insight confirmation (after processing answer) ──
  if (phase === "insight") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50/80 to-white p-5 space-y-4">
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-emerald-500 animate-spin" />
            <span className="text-sm text-emerald-700">Processing your answer…</span>
          </div>
        ) : (
          <>
            {/* What user said */}
            <div className="bg-white rounded-xl p-3 border border-emerald-100">
              <p className="text-[11px] font-semibold text-slate-400 uppercase mb-1">You said</p>
              <p className="text-sm text-slate-800 italic">&ldquo;{transcript}&rdquo;</p>
            </div>

            {/* AI insight */}
            {(insightData.sentiment || insightData.insight) && (
              <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-100">
                <p className="text-[11px] font-semibold text-slate-400 uppercase mb-1">AI understood</p>
                {insightData.sentiment && (
                  <p className="text-xs text-slate-600">
                    Sentiment: <span className="font-medium capitalize text-slate-800">{insightData.sentiment}</span>
                  </p>
                )}
                {insightData.insight && (
                  <p className="text-xs text-slate-600 mt-0.5">{insightData.insight}</p>
                )}
              </div>
            )}

            {/* Confirm / Try again */}
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isSubmitting ? "Adding…" : "Use this"}
              </button>
              <button
                onClick={handleReset}
                disabled={isSubmitting}
                className="px-3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm rounded-xl disabled:opacity-50 transition flex items-center gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Voice preview (after recording) ──
  if (phase === "preview" && transcript) {
    return (
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/80 to-white p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
            Smart follow-up
          </p>
          <p className="text-sm font-medium text-slate-900">{followUpData.question}</p>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-400 uppercase mb-1">You said</p>
          <p className="text-sm text-slate-800 italic">&ldquo;{transcript}&rdquo;</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleUseVoiceAnswer}
            className="flex-1 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition"
          >
            Use this
          </button>
          <button
            onClick={handleEditVoice}
            className="px-3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm rounded-xl transition flex items-center gap-1"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
      </div>
    );
  }

  // ── Voice listening state ──
  if (phase === "listening") {
    return (
      <div className="rounded-2xl border border-red-200 bg-gradient-to-b from-red-50/50 to-white p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">
            Listening…
          </p>
          <p className="text-sm font-medium text-slate-900">{followUpData.question}</p>
        </div>

        {/* Live transcript */}
        {transcript && (
          <div className="bg-white rounded-xl p-3 border border-red-100">
            <p className="text-sm text-slate-700 italic">&ldquo;{transcript}&rdquo;</p>
          </div>
        )}

        <button
          onClick={stopVoice}
          className="w-full px-3 py-3 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2"
        >
          <MicOff className="h-4 w-4" />
          Stop recording
        </button>

        {voiceError && (
          <p className="text-xs text-red-500">{voiceError}</p>
        )}
      </div>
    );
  }

  // ── Main: Follow-up question card ──
  return (
    <div className="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/80 to-white p-5 space-y-4">
      {/* Header + Question */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
            Smart follow-up
          </span>
        </div>
        <p className="text-[15px] font-semibold text-slate-900 leading-snug">
          {followUpData.question}
        </p>
        {followUpData.rationale && (
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            {followUpData.mode === "clarify_question"
              ? `You mentioned ${followUpData.topic?.replace(/_/g, " ")} — one more detail would help future guests.`
              : followUpData.mode === "basic_question"
              ? `${followUpData.topic?.replace(/_/g, " ")} hasn't been covered in your review yet.`
              : followUpData.rationale}
          </p>
        )}
      </div>

      {/* Quick replies — lowest friction */}
      {followUpData.quickReplies && followUpData.quickReplies.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {followUpData.quickReplies.map((reply) => (
            <button
              key={reply}
              onClick={() => handleQuickReply(reply)}
              disabled={isProcessing}
              className="px-3.5 py-2 rounded-xl text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 transition"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Voice — accelerator */}
      {voiceSupported && (
        <button
          onClick={startVoice}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition"
        >
          <Mic className="h-4 w-4" />
          Answer by voice
        </button>
      )}

      {voiceError && (
        <p className="text-xs text-red-500">{voiceError}</p>
      )}

      {/* Text input — optional detail */}
      {!showTextInput ? (
        <button
          onClick={() => setShowTextInput(true)}
          className="text-xs font-medium text-slate-400 hover:text-blue-500 transition"
        >
          + Add details in text
        </button>
      ) : (
        <div className="flex gap-1.5">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
            placeholder="Add details (optional)…"
            autoFocus
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
          />
          <button
            onClick={handleTextSubmit}
            disabled={!textInput.trim() || isProcessing}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-40 transition"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
