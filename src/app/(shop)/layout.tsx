// Inner pages (shop, product, cart, checkout, orders, login) sit in a centred container.
// The home page and other landing pages are full-bleed and live in the (site) group.
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>;
}
