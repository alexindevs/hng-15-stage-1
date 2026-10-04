// Viewing slot rules. Pure functions, safe to import from client and server code.
// Slots are one hour long, Monday to Saturday, in Lagos time (UTC+1, no daylight saving).
export const SLOT_HOURS = [9, 10, 11, 12, 13, 14, 15, 16];
export const HORIZON_DAYS = 14;
export const LEAD_HOURS = 12; // earliest bookable slot is this far in the future

export type Slot = { iso: string; label: string };
export type Day = { date: string; label: string; slots: Slot[] };

const hourLabel = (h: number) => `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`;

export function generateDays(now: Date = new Date()): Day[] {
  const lagos = new Date(now.getTime() + 3600_000);
  const days: Day[] = [];
  for (let i = 0; i < HORIZON_DAYS; i++) {
    const d = new Date(Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), lagos.getUTCDate() + i));
    if (d.getUTCDay() === 0) continue; // closed on Sundays
    const date = d.toISOString().slice(0, 10);
    const slots = SLOT_HOURS.map((h) => ({ iso: `${date}T${String(h).padStart(2, "0")}:00:00+01:00`, label: hourLabel(h) }))
      .filter((s) => new Date(s.iso).getTime() >= now.getTime() + LEAD_HOURS * 3600_000);
    if (slots.length)
      days.push({
        date,
        label: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }),
        slots,
      });
  }
  return days;
}

export const isValidSlot = (iso: string, now: Date = new Date()) =>
  generateDays(now).some((d) => d.slots.some((s) => new Date(s.iso).getTime() === new Date(iso).getTime()));

/** "Mon 5 Oct, 10:00 AM" in Lagos time, from any ISO timestamp. */
export function formatSlot(iso: string) {
  const l = new Date(new Date(iso).getTime() + 3600_000);
  const date = l.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  return `${date}, ${hourLabel(l.getUTCHours())}`;
}

/** Canonical key for comparing slots regardless of timezone formatting. */
export const slotKey = (iso: string) => new Date(iso).toISOString();
