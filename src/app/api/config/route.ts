import { NextResponse } from "next/server";
import { paystackConfigured } from "@/lib/paystack";
import { CONTACT, FEE_POLICY, inspectionFeeKobo } from "@/lib/site";

// GET /api/config -> public business details and payment options for the app.
export function GET() {
  return NextResponse.json({
    contact: CONTACT,
    inspection_fee_kobo: inspectionFeeKobo(),
    fee_policy: FEE_POLICY,
    paystack: paystackConfigured(),
  });
}
