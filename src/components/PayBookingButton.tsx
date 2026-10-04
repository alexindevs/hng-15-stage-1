"use client";
import { useState, useTransition } from "react";
import { retryBookingPayment } from "@/app/(shop)/book/actions";

export function PayBookingButton({ reference, label }: { reference: string; label: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div>
      <button
        className="btn-gold"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await retryBookingPayment(reference);
            if (r.ok) window.location.href = r.redirectUrl;
            else setError(r.error);
          })
        }
      >
        {pending ? "Please wait…" : label}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
