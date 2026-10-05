"use server";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { placeOrderCore, retryPaystackCore, type checkoutSchema } from "@/lib/checkout";
import type { z } from "zod";

export type CheckoutResult =
  | { ok: true; reference: string; redirectUrl?: string }
  | { ok: false; error: string };

export async function placeOrder(input: z.input<typeof checkoutSchema>): Promise<CheckoutResult> {
  let userId: string | null = null;
  if (supabaseConfigured()) userId = (await (await createClient()).auth.getUser()).data.user?.id ?? null;
  return placeOrderCore(input, userId);
}

/** "Pay now" on an order whose card payment was abandoned. */
export async function retryPaystackPayment(reference: string): Promise<{ ok: true; redirectUrl: string } | { ok: false; error: string }> {
  return retryPaystackCore(reference);
}
