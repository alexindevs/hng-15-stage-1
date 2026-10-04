import { getProducts } from "@/lib/products";
import { generateDays } from "@/lib/booking";
import { loadBookedCounts } from "@/lib/bookings";
import { inspectionFeeKobo, slotCapacity } from "@/lib/site";
import { paystackConfigured } from "@/lib/paystack";
import { BookingForm } from "@/components/BookingForm";
import { PageHeader } from "@/components/PageHeader";

export const metadata = {
  title: "Book a viewing",
  description: "Pick a date and time to inspect a vehicle in person before you buy.",
};
export const dynamic = "force-dynamic"; // slot availability changes constantly

export default async function Book({ searchParams }: { searchParams: Promise<{ vehicle?: string }> }) {
  const { vehicle } = await searchParams;
  const products = (await getProducts()).filter((p) => p.stock > 0);
  const initial = products.find((p) => p.slug === vehicle)?.slug ?? products[0]?.slug ?? "";
  return (
    <>
      <PageHeader eyebrow="Viewings by appointment" title="Book a viewing">
        See the vehicle in person before you decide. Choose a time and we will confirm your slot.
      </PageHeader>
      <BookingForm
        vehicles={products.map((p) => ({ slug: p.slug, name: p.name }))}
        initialSlug={initial}
        days={generateDays()}
        booked={await loadBookedCounts()}
        capacity={slotCapacity()}
        feeKobo={inspectionFeeKobo()}
        paystack={paystackConfigured()}
      />
    </>
  );
}
