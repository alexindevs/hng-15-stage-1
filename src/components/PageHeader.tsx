// Title block used at the top of inner pages.
export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-10">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="font-display mt-2 text-4xl sm:text-5xl">{title}</h1>
      {children && <div className="mt-3 max-w-2xl text-mute">{children}</div>}
    </div>
  );
}
