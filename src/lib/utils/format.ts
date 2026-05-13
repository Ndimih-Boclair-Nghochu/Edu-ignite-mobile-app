import { UserRole } from "@/lib/api/types";

export function formatMoney(
  value: number | string | null | undefined,
  currency = "XAF"
): string {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return `${currency} 0`;
  }

  return `${currency} ${numeric.toLocaleString()}`;
}

export function formatDate(value?: string | null): string {
  if (!value) {
    return "Not recorded";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(value?: string | null): string {
  if (!value) {
    return "Not recorded";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRole(role?: UserRole | string | null): string {
  return String(role ?? "USER")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getInitials(name?: string | null): string {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "EI";
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function formatPercentage(value: number | string | null | undefined): string {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return "0%";
  }

  return `${numeric.toFixed(numeric % 1 === 0 ? 0 : 1)}%`;
}

export function titleCase(value?: string | null): string {
  return String(value ?? "")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
