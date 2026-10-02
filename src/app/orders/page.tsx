import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { formatNaira } from "@/lib/format";

export const metadata = { title: "My orders" };

export default async function Orders() {
  if (!supabaseConfigured()) redirect("/login");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/orders");
  const { data: orders } = await supabase.from("orders").select("reference,status,total_kobo,created_at").order("created_at", { ascending: false });
  return (
    <>
      <h1 className="font-display text-4xl">My orders</h1>
      {!orders?.length ? (
        <p className="mt-6 text-mute">No orders yet. <Link href="/shop" className="text-gold">Start shopping</Link></p>
      ) : (
        <div className="mt-8 divide-y divide-line border-y border-line">
          {orders.map((o) => (
            <Link key={o.reference} href={`/order/${o.reference}`} className="flex justify-between py-4 hover:text-gold">
              <span>{o.reference} <span className="ml-3 text-xs uppercase text-mute">{o.status}</span></span>
              <span>{formatNaira(o.total_kobo)}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
