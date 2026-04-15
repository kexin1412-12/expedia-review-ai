import { NextResponse } from "next/server";
import { generateFollowUp } from "@/lib/ai";
import { getHotelById, getReviewsForHotel } from "@/lib/data-store";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hotel = getHotelById(id);
  if (!hotel) return NextResponse.json({ error: "Hotel not found." }, { status: 404 });

  const body = (await req.json()) as { draftReview?: string; focusDimension?: string };
  const draftReview = body.draftReview?.trim() || "";
  const focusDimension = body.focusDimension?.trim() || undefined;
  const followUp = await generateFollowUp(hotel, getReviewsForHotel(id), draftReview, focusDimension);
  return NextResponse.json(followUp);
}
