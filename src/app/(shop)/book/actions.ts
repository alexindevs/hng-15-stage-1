"use server";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createBookingCore, retryBookingCore, type bookingSchema } from "@/lib/bookings-create";
import type { z } from "zod";

export type BookingResult =
  | { ok: true; reference: string; redirectUrl?: string }
  | { ok: false; error: string };

export async function createBooking(input: z.input<typeof bookingSchema>): Promise<BookingResult> {
  let userId: string | null = null;
  if (supabaseConfigured()) userId = (await (await createClient()).auth.getUser()).data.user?.id ?? null;
  return createBookingCore(input, userId);
}

/** "Pay now" on a booking whose inspection fee is still unpaid. */
export async function retryBookingPayment(reference: string): Promise<{ ok: true; redirectUrl: string } | { ok: false; error: string }> {
  return retryBookingCore(reference);
}
