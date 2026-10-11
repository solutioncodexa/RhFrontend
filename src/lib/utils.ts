import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function scrollContentTop() {
  window.scrollTo(0, 0);
  document.querySelector("main")?.scrollTo(0, 0);
}

export function moneyMAD(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("fr-MA", { dateStyle: "medium" }).format(d);
}

export function fullName(row: Record<string, unknown> | null | undefined) {
  if (!row) return "—";
  const first = String(row.firstName ?? row.first_name ?? "");
  const last = String(row.lastName ?? row.last_name ?? "");
  const name = `${first} ${last}`.trim();
  return name || String(row.fullName ?? row.name ?? row.email ?? "—");
}

export function pick(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const parts = key.split(".");
    let cur: unknown = row;
    for (const p of parts) {
      if (cur == null || typeof cur !== "object") {
        cur = undefined;
        break;
      }
      cur = (cur as Record<string, unknown>)[p];
    }
    if (cur != null && cur !== "") return cur;
  }
  return undefined;
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function idOf(row: Record<string, unknown>): string {
  return String(row.id ?? row.uuid ?? "");
}
