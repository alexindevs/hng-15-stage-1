import { CheckoutForm } from "@/components/CheckoutForm";
import { paystackConfigured } from "@/lib/paystack";

export const metadata = { title: "Checkout" };
export const dynamic = "force-dynamic"; // reads env at request time

export default function Checkout() {
  return <CheckoutForm paystack={paystackConfigured()} />;
}
