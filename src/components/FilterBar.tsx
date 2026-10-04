"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const PRICE_BANDS = [
  { value: "", label: "Any price" },
  { value: "0-1000000", label: "Under ₦1m" },
  { value: "1000000-5000000", label: "₦1m to ₦5m" },
  { value: "5000000-20000000", label: "₦5m to ₦20m" },
  { value: "20000000-50000000", label: "₦20m to ₦50m" },
  { value: "50000000-", label: "₦50m and above" },
];
export const YEAR_BANDS = [
  { value: "", label: "Any year" },
  { value: "2022-", label: "2022 or newer" },
  { value: "2018-", label: "2018 or newer" },
  { value: "2014-", label: "2014 or newer" },
  { value: "-2013", label: "2013 or older" },
];
export const SORTS = [
  { value: "", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "year-desc", label: "Year: newest" },
];

/** Category pills + price / year / sort selects. Everything lives in the URL so results are shareable. */
export function FilterBar({ categories }: { categories: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const href = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };
  const active = params.get("category") ?? "";
  const hasFilters = ["category", "price", "year", "sort"].some((k) => params.get(k));

  const select = (key: string, label: string, options: { value: string; label: string }[]) => (
    <label className="block text-xs text-mute">
      <span className="eyebrow">{label}</span>
      <select
        className="input mt-1.5 !py-2 text-sm text-bone"
        value={params.get(key) ?? ""}
        onChange={(e) => router.push(href(key, e.target.value), { scroll: false })}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );

  return (
    <div className="space-y-5">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 text-sm">
        {["", ...categories].map((c) => (
          <Link
            key={c || "all"}
            href={href("category", c)}
            scroll={false}
            className={`shrink-0 rounded-full border px-4 py-2 transition ${c === active ? "border-gold bg-gold text-black" : "border-line hover:border-gold/60"}`}
          >
            {c || "All vehicles"}
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {select("price", "Price", PRICE_BANDS)}
        {select("year", "Year", YEAR_BANDS)}
        {select("sort", "Sort by", SORTS)}
        <div className="flex items-end">
          {hasFilters && (
            <Link href={pathname} scroll={false} className="btn-ghost w-full !py-2 text-sm">Clear filters</Link>
          )}
        </div>
      </div>
    </div>
  );
}
