import { NextResponse } from "next/server";
import { getHotelById, getReviewsForHotel } from "@/lib/data-store";
import { computeKnowledgeHealth } from "@/lib/knowledge-health";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hotel = getHotelById(id);
  if (!hotel) return NextResponse.json({ error: "Hotel not found." }, { status: 404 });

  const health = await computeKnowledgeHealth(hotel, getReviewsForHotel(id));
  return NextResponse.json(health);
}
