import { NextRequest, NextResponse } from "next/server";
import { detectBestGap } from "@/lib/ai/gapDetection";
import { PropertyContext, ReviewRecord } from "@/types/ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const property = body.property as PropertyContext;
    const reviews = body.reviews as ReviewRecord[];
    const currentReviewText = body.currentReviewText as string;

    if (!property || !reviews || typeof currentReviewText !== "string") {
      return NextResponse.json(
        { error: "Invalid request payload." },
        { status: 400 }
      );
    }

    const result = await detectBestGap({
      property,
      reviews,
      currentReviewText,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to detect best gap." },
      { status: 500 }
    );
  }
}
