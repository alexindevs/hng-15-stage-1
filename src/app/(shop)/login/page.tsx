"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginInner() {
  const next = useSearchParams().get("next") ?? "/shop";
  const [err, setErr] = useState("");
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  async function google() {
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) setErr(error.message);
  }
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-line bg-panel p-8 text-center sm:p-10">
      <p className="eyebrow">Welcome back</p>
      <h1 className="font-display mt-2 text-4xl">Sign in</h1>
      <p className="mt-3 text-sm text-mute">Sign in to track your orders and viewings. You can also check out as a guest.</p>
      <button className="btn-gold mt-6 w-full" onClick={google} disabled={!configured}>Continue with Google</button>
      {!configured && <p className="mt-3 text-sm text-mute">Google sign-in is unavailable until Supabase is configured.</p>}
      {err && <p role="alert" className="mt-3 text-red-400">{err}</p>}
    </div>
  );
}

export default function Login() {
  return <Suspense><LoginInner /></Suspense>;
}
