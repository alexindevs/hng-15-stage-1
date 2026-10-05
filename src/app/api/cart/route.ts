import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, err } from "@/lib/api-auth";
import { productsBySlug, readCart } from "@/lib/cart-db";

// Server-side cart. Auth: `Authorization: Bearer <Supabase access token>` (or the website's session cookie).
//   GET    /api/cart                       -> { items, count, total_kobo }
//   POST   /api/cart  { slug, quantity? }  -> add (quantity defaults to 1, capped at stock)
//   PUT    /api/cart  { items:[{slug,quantity}] } -> replace the whole cart (used to sync a device cart)
//   DELETE /api/cart                       -> empty the cart
// Clients never send prices; every response is rebuilt from the products table.

const line = z.object({ slug: z.string().min(1).max(200), quantity: z.number().int().min(1).max(99) });
const addBody = z.object({ slug: z.string().min(1).max(200), quantity: z.number().int().min(1).max(99).default(1) });
const putBody = z.object({ items: z.array(line).max(50) });

export async function GET(req: NextRequest) {
  const a = await authenticate(req);
  if (a instanceof NextResponse) return a;
  try {
    return NextResponse.json(await readCart(a.sb, a.user.id));
  } catch (e) {
    return err(e instanceof Error ? e.message : "Could not read cart.", 500);
  }
}

export async function POST(req: NextRequest) {
  const a = await authenticate(req);
  if (a instanceof NextResponse) return a;
  const body = addBody.safeParse(await req.json().catch(() => null));
  if (!body.success) return err("Expected { slug, quantity? }.", 400);
  try {
    const found = (await productsBySlug(a.sb, [body.data.slug])).get(body.data.slug);
    if (!found) return err("Vehicle not found.", 404);
    if (found.stock <= 0) return err("Sold out.", 409);
    const { data: existing } = await a.sb
      .from("cart_items").select("quantity").eq("user_id", a.user.id).eq("product_id", found.id).maybeSingle();
    const quantity = Math.min((existing?.quantity ?? 0) + body.data.quantity, found.stock);
    const { error } = await a.sb
      .from("cart_items")
      .upsert({ user_id: a.user.id, product_id: found.id, quantity, updated_at: new Date().toISOString() });
    if (error) return err(error.message, 500);
    return NextResponse.json(await readCart(a.sb, a.user.id));
  } catch (e) {
    return err(e instanceof Error ? e.message : "Could not update cart.", 500);
  }
}

export async function PUT(req: NextRequest) {
  const a = await authenticate(req);
  if (a instanceof NextResponse) return a;
  const body = putBody.safeParse(await req.json().catch(() => null));
  if (!body.success) return err("Expected { items: [{ slug, quantity }] }.", 400);
  try {
    // Merge duplicate slugs, drop unknown / sold-out products, cap at stock.
    const wanted = new Map<string, number>();
    for (const i of body.data.items) wanted.set(i.slug, (wanted.get(i.slug) ?? 0) + i.quantity);
    const products = await productsBySlug(a.sb, [...wanted.keys()]);
    const rows = [...wanted].flatMap(([slug, qty]) => {
      const p = products.get(slug);
      if (!p || p.stock <= 0) return [];
      return [{ user_id: a.user.id, product_id: p.id, quantity: Math.min(qty, p.stock), updated_at: new Date().toISOString() }];
    });
    if (rows.length) {
      const { error } = await a.sb.from("cart_items").upsert(rows);
      if (error) return err(error.message, 500);
    }
    const keep = rows.map((r) => r.product_id);
    let del = a.sb.from("cart_items").delete().eq("user_id", a.user.id);
    if (keep.length) del = del.not("product_id", "in", `(${keep.join(",")})`);
    const { error: delErr } = await del;
    if (delErr) return err(delErr.message, 500);
    return NextResponse.json(await readCart(a.sb, a.user.id));
  } catch (e) {
    return err(e instanceof Error ? e.message : "Could not update cart.", 500);
  }
}

export async function DELETE(req: NextRequest) {
  const a = await authenticate(req);
  if (a instanceof NextResponse) return a;
  const { error } = await a.sb.from("cart_items").delete().eq("user_id", a.user.id);
  if (error) return err(error.message, 500);
  return NextResponse.json({ items: [], count: 0, total_kobo: 0 });
}
