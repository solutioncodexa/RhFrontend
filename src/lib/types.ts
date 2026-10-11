export const MOROCCAN_CITIES = [
  "Casablanca",
  "Rabat",
  "Marrakech",
  "Tanger",
  "Agadir",
  "Fès",
  "Meknès",
  "Oujda",
  "Kénitra",
  "El Jadida",
] as const;

export const DEMO_ACCOUNTS = [
  { email: "admin@rhflow.ma", password: "Admin@123456", role: "COMPANY_ADMIN" },
  { email: "manager@rhflow.ma", password: "Manager@123456", role: "MANAGER" },
  { email: "employee@rhflow.ma", password: "Employee@123456", role: "EMPLOYEE" },
  { email: "superadmin@rhflow.ma", password: "Super@123456", role: "SUPER_ADMIN" },
] as const;

export type Role = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "EMPLOYEE";

export function normalizeRole(role?: string | null): Role {
  const r = (role ?? "").toUpperCase();
  if (r === "SUPER_ADMIN") return "SUPER_ADMIN";
  if (r === "MANAGER") return "MANAGER";
  if (r === "EMPLOYEE") return "EMPLOYEE";
  return "ADMIN";
}

export type AuthUser = {
  id: number | string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId?: number | string | null;
  permissions?: string[];
  locale?: string;
  employeeId?: number | string | null;
};

export function hasPermission(user: AuthUser | null | undefined, code: string) {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (role === "ADMIN") return true;
  if (role === "SUPER_ADMIN") return code.startsWith("PLATFORM") || code === "*";
  const perms = user.permissions ?? [];
  return perms.includes("*") || perms.includes(code);
}

export type PageResult<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};
