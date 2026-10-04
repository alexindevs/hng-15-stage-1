"use client";
import { useState, useTransition } from "react";
import { retryPaystackPayment } from "@/app/(shop)/checkout/actions";

export function PayNowButton({ reference }: { reference: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div className="mt-6">
      <button
        className="btn-gold"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await retryPaystackPayment(reference);
            if (r.ok) window.location.href = r.redirectUrl;
            else setError(r.error);
          })
        }
      >
        {pending ? "Please wait…" : "Pay now with Paystack"}
      </button>
      {error && <p role="alert" className="mt-2 text-red-400">{error}</p>}
    </div>
  );
}
