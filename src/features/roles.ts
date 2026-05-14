import { UserRole } from "@/lib/api/types";

export const EXECUTIVE_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "CEO",
  "CTO",
  "COO",
  "INV",
  "DESIGNER",
];

export const SCHOOL_ADMIN_ROLES: UserRole[] = ["SCHOOL_ADMIN", "SUB_ADMIN"];

export const RECOGNITION_ROLES: UserRole[] = ["TEACHER", "BURSAR", "LIBRARIAN"];

export const STAFF_ROLES: UserRole[] = [
  "SCHOOL_ADMIN",
  "SUB_ADMIN",
  "TEACHER",
  "BURSAR",
  "LIBRARIAN",
];

export const PRIMARY_FOUNDER_ROLES: UserRole[] = ["CEO", "CTO"];

export function isExecutiveRole(role?: UserRole | string | null): boolean {
  return EXECUTIVE_ROLES.includes((role ?? "") as UserRole);
}

export function isSchoolAdminRole(role?: UserRole | string | null): boolean {
  return SCHOOL_ADMIN_ROLES.includes((role ?? "") as UserRole);
}

export function isPrimaryFounderRole(role?: UserRole | string | null): boolean {
  return PRIMARY_FOUNDER_ROLES.includes((role ?? "") as UserRole);
}
