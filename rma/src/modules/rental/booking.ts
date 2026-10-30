// Rental booking options (spec): how a car is held when reserved.
// Pure constants — importable by both client components and server actions.

export const BOOKING_BASIS = [
  "booked",
  "booked_by_payment",
  "booked_by_documents",
  "repeat_client",
] as const;

export type BookingBasis = (typeof BOOKING_BASIS)[number];

export const BOOKING_BASIS_LABEL: Record<string, string> = {
  booked: "Booked",
  booked_by_payment: "Booked by payment",
  booked_by_documents: "Booked by documents",
  repeat_client: "Repeat client",
};

export function isBookingBasis(v: unknown): v is BookingBasis {
  return typeof v === "string" && (BOOKING_BASIS as readonly string[]).includes(v);
}
