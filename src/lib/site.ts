// Business details and booking rules in one place. Contact details are PLACEHOLDERS until the client
// supplies the real ones; set the NEXT_PUBLIC_CONTACT_* variables to override without a code change.
export const CONTACT = {
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "+234 800 000 0000",
  whatsapp: process.env.NEXT_PUBLIC_CONTACT_WHATSAPP ?? "2348000000000",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@egoolisa.ng",
  address: process.env.NEXT_PUBLIC_CONTACT_ADDRESS ?? "Lagos, Nigeria",
  hours: [
    ["Monday to Saturday", "9:00 AM to 5:00 PM"],
    ["Sunday", "Closed"],
  ] as const,
};

/** Inspection fee charged for a viewing, in kobo. Default NGN 20,000. Server-side only. */
export const inspectionFeeKobo = () => {
  const v = Number(process.env.INSPECTION_FEE_KOBO);
  return Number.isInteger(v) && v >= 0 && process.env.INSPECTION_FEE_KOBO ? v : 2_000_000;
};

/** How many viewings can be booked into the same slot. Server-side only. */
export const slotCapacity = () => {
  const v = Number(process.env.BOOKING_SLOT_CAPACITY);
  return Number.isInteger(v) && v > 0 ? v : 2;
};

/** Shown wherever the inspection fee is mentioned. */
export const FEE_POLICY = "The inspection fee is non-refundable.";

/** Bank account for transfers (orders and inspection fees). Null until BANK_* env vars are set. Server-side only. */
export const bankDetails = () => {
  const bank = process.env.BANK_NAME, name = process.env.BANK_ACCOUNT_NAME, number = process.env.BANK_ACCOUNT_NUMBER;
  return bank && name && number ? { bank, name, number } : null;
};
