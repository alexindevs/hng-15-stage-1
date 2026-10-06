"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

// Landing page for the mobile app's Google sign-in. Supabase redirects here (an https URL that is already in the
// Redirect URLs list for the website) with the session in the URL fragment; this page hands it to the app's deep link.
// Only the app's own schemes are accepted, so it cannot forward tokens to an arbitrary site.
const ALLOWED = [/^egoolisa:\/\//, /^exps?:\/\//, /^exp\+[a-z][a-z0-9.-]*:\/\//];

function Bounce() {
  const to = useSearchParams().get("to") ?? "";
  const [href, setHref] = useState<string | null>(null);
  const valid = ALLOWED.some((re) => re.test(to));

  useEffect(() => {
    if (!valid) return;
    const target = to + window.location.hash;
    setHref(target);
    window.location.replace(target);
  }, [to, valid]);

  if (!valid) return <p className="py-20 text-center text-mute">Invalid sign-in link.</p>;
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-line bg-panel p-8 text-center">
      <h1 className="font-display text-3xl">Signed in</h1>
      <p className="mt-3 text-sm text-mute">Returning you to the app. If nothing happens, tap the button.</p>
      {href && <a href={href} className="btn-gold mt-6 w-full">Open the app</a>}
    </div>
  );
}

export default function MobileAuthReturn() {
  return <Suspense><Bounce /></Suspense>;
}
