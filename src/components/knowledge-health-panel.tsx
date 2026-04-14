"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  HelpCircle,
  Clock,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { KnowledgeHealthResponse, CoverageStatus, TrendDirection, DimensionHealth } from "@/types";

const statusConfig: Record<CoverageStatus, { color: string; bg: string; border: string; icon: typeof CheckCircle2 }> = {
  "WELL COVERED":       { color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200", icon: CheckCircle2 },
  "MEDIUM COVERAGE":    { color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200",   icon: Activity },
  "LOW RECENT COVERAGE":{ color: "text-orange-700",  bg: "bg-orange-50",   border: "border-orange-200",  icon: AlertTriangle },
  "STALE":              { color: "text-red-700",      bg: "bg-red-50",      border: "border-red-200",     icon: Clock },
  "UNCERTAIN":          { color: "text-slate-500",    bg: "bg-slate-50",    border: "border-slate-200",   icon: HelpCircle },
};

const trendIcons: Record<TrendDirection, typeof ArrowUp> = {
  improving: ArrowUp,
  stable: ArrowRight,
  declining: ArrowDown,
  unknown: HelpCircle,
};

const trendColors: Record<TrendDirection, string> = {
  improving: "text-emerald-600",
  stable: "text-slate-500",
  declining: "text-red-500",
  unknown: "text-slate-400",
};

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference * (1 - score / 100);
  const scoreColor =
    score >= 70 ? "text-emerald-600" : score >= 40 ? "text-amber-500" : "text-red-500";
  const strokeColor =
    score >= 70 ? "#059669" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="40" fill="none"
          stroke={strokeColor} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span className={`text-2xl font-bold ${scoreColor}`}>{score}</span>
    </div>
  );
}

function DimensionCard({ dim }: { dim: DimensionHealth }) {
  const cfg = statusConfig[dim.coverage];
  const StatusIcon = cfg.icon;
  const TrendIcon = trendIcons[dim.trend];

  return (
    <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-4 transition hover:shadow-md`}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-800">{dim.dimension}</h4>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cfg.color} ${cfg.bg}`}>
          <StatusIcon className="h-3 w-3" />
          {dim.coverage}
        </span>
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-600 line-clamp-2">{dim.summary}</p>

      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
        <span>{dim.mentionCount} mentions</span>
        <span>{dim.recentMentionCount} recent</span>
        {dim.avgScore !== null && (
          <span className="font-semibold text-slate-700">{dim.avgScore}/5</span>
        )}
        <span className={`ml-auto inline-flex items-center gap-0.5 ${trendColors[dim.trend]}`}>
          <TrendIcon className="h-3 w-3" />
          {dim.trend}
        </span>
      </div>

      {dim.questionCandidates.length > 0 && (
        <div className="mt-3 space-y-1">
          {dim.questionCandidates.slice(0, 2).map((q, i) => (
            <div key={i} className="rounded-lg bg-white/70 px-2.5 py-1.5 text-[11px] text-slate-600">
              💬 {q}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function KnowledgeHealthPanel({ hotelId }: { hotelId: string }) {
  const [data, setData] = useState<KnowledgeHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(`/api/hotels/${hotelId}/knowledge-health`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [hotelId]);

  if (loading) {
    return (
      <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-card">
        <div className="flex items-center gap-3 text-slate-500">
          <TrendingUp className="h-5 w-5 animate-pulse" />
          <span className="text-sm font-semibold">Analyzing property knowledge health...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-[30px] border border-red-100 bg-red-50 p-8 shadow-card">
        <p className="text-sm text-red-600">Failed to load knowledge health data.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-card">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-expediaBlue">
            <TrendingUp className="h-3.5 w-3.5" />
            Property Knowledge Health
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Coverage analysis across {data.dimensions.length} dimensions based on {" "}
            guest reviews and property description.
          </p>
        </div>
        <ScoreRing score={data.overallScore} />
      </div>

      {/* Dimension grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.dimensions.map((dim) => (
          <DimensionCard key={dim.dimension} dim={dim} />
        ))}
      </div>

      {/* Dynamic follow-up questions */}
      {data.dynamicFollowUps.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Sparkles className="h-4 w-4 text-expediaBlue" />
            Suggested follow-up questions to close gaps
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {data.dynamicFollowUps.map((fu, i) => (
              <div
                key={i}
                className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-5"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-expediaBlue">
                  {fu.topic}
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-800">{fu.question}</p>
                <p className="mt-1.5 text-xs text-slate-500">{fu.rationale}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {fu.quickReplies.map((r) => (
                    <span
                      key={r}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-[11px] text-slate-400">
        Generated at {new Date(data.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}
