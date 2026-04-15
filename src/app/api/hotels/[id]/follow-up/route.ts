import { NextResponse } from "next/server";
import { generateFollowUp } from "@/lib/ai";
import { getHotelById, getReviewsForHotel } from "@/lib/data-store";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hotel = getHotelById(id);
  if (!hotel) return NextResponse.json({ error: "Hotel not found." }, { status: 404 });

  const body = (await req.json()) as { draftReview?: string; focusDimension?: string; answeredTopics?: string[] };
  const draftReview = body.draftReview?.trim() || "";
  const focusDimension = body.focusDimension?.trim() || undefined;
  const answeredTopics = Array.isArray(body.answeredTopics) ? body.answeredTopics : undefined;
  const followUp = await generateFollowUp(hotel, getReviewsForHotel(id), draftReview, focusDimension, answeredTopics);
  if (!followUp) return NextResponse.json({ skip: true, reason: "Topic already covered in detail." });
  return NextResponse.json(followUp);
}
