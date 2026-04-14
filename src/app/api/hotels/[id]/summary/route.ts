import { NextResponse } from "next/server";
import { generateHotelSummary } from "@/lib/ai";
import { getHotelById, getReviewsForHotel } from "@/lib/data-store";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hotel = getHotelById(id);
  if (!hotel) return NextResponse.json({ error: "Hotel not found." }, { status: 404 });

  const summary = await generateHotelSummary(hotel, getReviewsForHotel(id));
  return NextResponse.json(summary);
}
