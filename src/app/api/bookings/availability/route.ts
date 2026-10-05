import { NextResponse } from "next/server";
import { generateDays } from "@/lib/booking";
import { loadBookedCounts } from "@/lib/bookings";
import { getProducts } from "@/lib/products";
import { inspectionFeeKobo, slotCapacity } from "@/lib/site";
import { paystackConfigured } from "@/lib/paystack";

export const dynamic = "force-dynamic";

// GET /api/bookings/availability -> bookable days/slots, how many viewings each slot already holds, capacity, fee, vehicles.
export async function GET() {
  const products = (await getProducts()).filter((p) => p.stock > 0);
  return NextResponse.json({
    days: generateDays(),
    booked: await loadBookedCounts(),
    capacity: slotCapacity(),
    fee_kobo: inspectionFeeKobo(),
    paystack: paystackConfigured(),
    vehicles: products.map((p) => ({ slug: p.slug, name: p.name })),
  });
}
