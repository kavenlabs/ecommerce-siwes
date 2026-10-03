export { cn } from "cn";

/** Naira, whole numbers. No decimals anywhere in the UI. */
export function naira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString("en-NG")}`;
}
