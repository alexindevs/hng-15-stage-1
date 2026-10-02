// Placeholder artwork until real product photos are uploaded (see status.md).
export function ProductArt({ name, src }: { name: string; src?: string | null }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className="h-full w-full object-cover" />;
  }
  const initials = name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0]).join("");
  return (
    <div
      role="img"
      aria-label={name}
      className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#2a2412,#0a0a0a_70%)]"
    >
      <span className="font-display gold-text text-5xl">{initials}</span>
    </div>
  );
}
