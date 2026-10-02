import { SHOP_NAME } from "@/lib/format";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line py-10 text-center text-sm text-mute">
      <p className="font-display text-lg gold-text">{SHOP_NAME}</p>
      <p className="mt-1">Cars, SUVs and motorcycles, honestly sold. Lagos, Nigeria.</p>
      <p className="mt-4">© {new Date().getFullYear()} {SHOP_NAME}</p>
    </footer>
  );
}
