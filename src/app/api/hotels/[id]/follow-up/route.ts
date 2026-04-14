import { NextResponse } from "next/server";
import { generateFollowUp } from "@/lib/ai";
import { getHotelById, getReviewsForHotel } from "@/lib/data-store";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hotel = getHotelById(id);
  if (!hotel) return NextResponse.json({ error: "Hotel not found." }, { status: 404 });

  const body = (await req.json()) as { draftReview?: string };
  const draftReview = body.draftReview?.trim() || "";
  const followUp = await generateFollowUp(hotel, getReviewsForHotel(id), draftReview);
  return NextResponse.json(followUp);
}
