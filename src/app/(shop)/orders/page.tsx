import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { formatNaira } from "@/lib/format";
import { formatSlot } from "@/lib/booking";
import { PageHeader } from "@/components/PageHeader";

export const metadata = { title: "My orders and viewings" };

export default async function Orders() {
  if (!supabaseConfigured()) redirect("/login");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/orders");
  const [{ data: orders }, { data: bookings }] = await Promise.all([
    supabase.from("orders").select("reference,status,total_kobo,created_at").order("created_at", { ascending: false }),
    supabase.from("bookings").select("reference,product_name,slot_start,status").order("slot_start", { ascending: false }),
  ]);
  const row = "flex items-center justify-between gap-4 p-5 transition hover:bg-white/[.03]";
  const pill = "ml-3 rounded-full border border-line px-2.5 py-0.5 text-xs uppercase tracking-widest text-mute";
  return (
    <>
      <PageHeader eyebrow="Account" title="My orders and viewings" />

      <h2 className="font-display text-2xl">Viewings</h2>
      {!bookings?.length ? (
        <p className="mt-3 text-mute">No viewings yet. <Link href="/book" className="text-gold hover:underline">Book one</Link></p>
      ) : (
        <div className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
          {bookings.map((b) => (
            <Link key={b.reference} href={`/booking/${b.reference}`} className={row}>
              <span>{b.product_name}<span className={pill}>{b.status}</span><br /><span className="text-sm text-mute">{formatSlot(b.slot_start)}</span></span>
              <span className="text-sm text-mute">{b.reference}</span>
            </Link>
          ))}
        </div>
      )}

      <h2 className="font-display mt-12 text-2xl">Orders</h2>
      {!orders?.length ? (
        <p className="mt-3 text-mute">No orders yet. <Link href="/shop" className="text-gold hover:underline">Start browsing</Link></p>
      ) : (
        <div className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
          {orders.map((o) => (
            <Link key={o.reference} href={`/order/${o.reference}`} className={row}>
              <span>{o.reference}<span className={pill}>{o.status}</span></span>
              <span className="font-semibold text-gold">{formatNaira(o.total_kobo)}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
