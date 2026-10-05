import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, err } from "@/lib/api-auth";
import { productsBySlug, readCart } from "@/lib/cart-db";

// PATCH  /api/cart/:slug { quantity }  -> set quantity (0 removes the line; capped at stock)
// DELETE /api/cart/:slug               -> remove the line
type Ctx = { params: Promise<{ slug: string }> };
const patchBody = z.object({ quantity: z.number().int().min(0).max(99) });

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const a = await authenticate(req);
  if (a instanceof NextResponse) return a;
  const { slug } = await params;
  const body = patchBody.safeParse(await req.json().catch(() => null));
  if (!body.success) return err("Expected { quantity }.", 400);
  try {
    const found = (await productsBySlug(a.sb, [slug])).get(slug);
    if (!found) return err("Vehicle not found.", 404);
    if (body.data.quantity === 0) {
      const { error } = await a.sb.from("cart_items").delete().eq("user_id", a.user.id).eq("product_id", found.id);
      if (error) return err(error.message, 500);
    } else {
      const { error } = await a.sb.from("cart_items").upsert({
        user_id: a.user.id,
        product_id: found.id,
        quantity: Math.min(body.data.quantity, Math.max(found.stock, 1)),
        updated_at: new Date().toISOString(),
      });
      if (error) return err(error.message, 500);
    }
    return NextResponse.json(await readCart(a.sb, a.user.id));
  } catch (e) {
    return err(e instanceof Error ? e.message : "Could not update cart.", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const a = await authenticate(req);
  if (a instanceof NextResponse) return a;
  const { slug } = await params;
  try {
    const found = (await productsBySlug(a.sb, [slug])).get(slug);
    if (found) {
      const { error } = await a.sb.from("cart_items").delete().eq("user_id", a.user.id).eq("product_id", found.id);
      if (error) return err(error.message, 500);
    }
    return NextResponse.json(await readCart(a.sb, a.user.id));
  } catch (e) {
    return err(e instanceof Error ? e.message : "Could not update cart.", 500);
  }
}
