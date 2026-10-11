import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  FileSignature,
  CalendarCheck,
  UserX,
  Clock,
  Palmtree,
  Receipt,
  Megaphone,
  FolderOpen,
  ClipboardList,
  BarChart3,
  Sparkles,
  Shield,
  Settings,
  ScrollText,
  Building,
  BadgeDollarSign,
  FileSpreadsheet,
  CalendarDays,
  ListTodo,
  Plane,
  Wallet,
  UserPlus,
  UserMinus,
  Star,
  Target,
  UserSearch,
  Contact,
  Network,
  GraduationCap,
  PenLine,
  MapPin,
  CalendarClock,
  Landmark,
  Package,
  Gavel,
  Calculator,
} from "lucide-react";
import { hasPermission, normalizeRole, type AuthUser } from "@/lib/types";
import type { TKey } from "@/lib/i18n";

export type NavItem = {
  to: string;
  key: TKey;
  icon: LucideIcon;
  permission?: string;
  roles?: string[];
};

export type NavGroup = { label: TKey; items: NavItem[] };

export const navGroups: NavGroup[] = [
  {
    label: "dashboard",
    items: [
      { to: "/app", key: "dashboard", icon: LayoutDashboard, permission: "STATS_VIEW" },
      { to: "/portal", key: "portalHome", icon: LayoutDashboard, roles: ["MANAGER"] },
    ],
  },
  {
    label: "employees",
    items: [
      { to: "/app/employees", key: "employeeList", icon: Users, permission: "EMPLOYEES_VIEW" },
      { to: "/app/org", key: "orgChart", icon: Network, permission: "EMPLOYEES_VIEW" },
      { to: "/app/profile-changes", key: "profileChanges", icon: PenLine, permission: "EMPLOYEES_EDIT" },
      { to: "/app/training", key: "training", icon: GraduationCap, permission: "EMPLOYEES_VIEW" },
      { to: "/app/departments", key: "departments", icon: Building2, permission: "EMPLOYEES_VIEW" },
      { to: "/app/positions", key: "positions", icon: Briefcase, permission: "EMPLOYEES_VIEW" },
      { to: "/app/contracts", key: "contracts", icon: FileSignature, permission: "CONTRACTS_VIEW" },
      { to: "/app/assets", key: "assets", icon: Package, permission: "EMPLOYEES_VIEW" },
      { to: "/app/disciplinary", key: "disciplinary", icon: Gavel, permission: "EMPLOYEES_EDIT" },
    ],
  },
  {
    label: "attendance",
    items: [
      { to: "/app/attendance", key: "attendance", icon: CalendarCheck, permission: "ATTENDANCE_VIEW" },
      { to: "/app/absences", key: "absences", icon: UserX, permission: "ATTENDANCE_VIEW" },
      { to: "/app/working-hours", key: "workingHours", icon: Clock, permission: "ATTENDANCE_VIEW" },
      { to: "/app/establishments", key: "establishments", icon: MapPin, permission: "ATTENDANCE_VIEW" },
      { to: "/app/shifts", key: "shifts", icon: CalendarClock, permission: "ATTENDANCE_MANAGE" },
      { to: "/app/shift-assignments", key: "shiftAssignments", icon: CalendarClock, permission: "ATTENDANCE_MANAGE" },
    ],
  },
  {
    label: "leave",
    items: [
      { to: "/app/leave-requests", key: "leaveRequests", icon: Palmtree, permission: "LEAVE_VIEW" },
      { to: "/app/leave-balances", key: "leaveBalances", icon: ListTodo, permission: "LEAVE_VIEW" },
      { to: "/app/leave-calendar", key: "leaveCalendar", icon: CalendarDays, permission: "LEAVE_VIEW" },
    ],
  },
  {
    label: "payroll",
    items: [
      { to: "/app/payroll", key: "periods", icon: BadgeDollarSign, permission: "PAYROLL_VIEW" },
      { to: "/app/payslips", key: "payslips", icon: Receipt, permission: "PAYROLL_VIEW" },
      { to: "/app/declarations", key: "declarations", icon: FileSpreadsheet, permission: "PAYROLL_VIEW" },
      { to: "/app/loans", key: "loans", icon: Landmark, permission: "PAYROLL_VIEW" },
      { to: "/app/payroll-tools", key: "payrollTools", icon: Calculator, permission: "PAYROLL_VIEW" },
    ],
  },
  {
    label: "frais",
    items: [
      { to: "/app/expenses", key: "expenses", icon: Wallet, permission: "EXPENSES_VIEW" },
      { to: "/app/trips", key: "trips", icon: Plane, permission: "EXPENSES_VIEW" },
    ],
  },
  {
    label: "parcours",
    items: [
      { to: "/app/onboarding", key: "onboarding", icon: UserPlus, permission: "EMPLOYEES_VIEW" },
      { to: "/app/offboarding", key: "offboarding", icon: UserMinus, permission: "EMPLOYEES_VIEW" },
    ],
  },
  {
    label: "performance",
    items: [
      { to: "/app/reviews", key: "reviews", icon: Star, permission: "PERFORMANCE_MANAGE" },
      { to: "/app/objectives", key: "objectives", icon: Target, permission: "PERFORMANCE_MANAGE" },
    ],
  },
  {
    label: "recruitment",
    items: [
      { to: "/app/jobs", key: "jobs", icon: UserSearch, permission: "RECRUITMENT_MANAGE" },
      { to: "/app/candidates", key: "candidates", icon: Contact, permission: "RECRUITMENT_MANAGE" },
    ],
  },
  {
    label: "documents",
    items: [{ to: "/app/documents", key: "documents", icon: FolderOpen, permission: "DOCUMENTS_VIEW" }],
  },
  {
    label: "requests",
    items: [{ to: "/app/requests", key: "requests", icon: ClipboardList, permission: "REQUESTS_CREATE" }],
  },
  {
    label: "communication",
    items: [
      { to: "/app/announcements", key: "announcements", icon: Megaphone, permission: "ANNOUNCEMENTS_VIEW" },
    ],
  },
  {
    label: "reports",
    items: [{ to: "/app/reports", key: "reports", icon: BarChart3, permission: "STATS_VIEW" }],
  },
  {
    label: "assistant",
    items: [{ to: "/app/assistant", key: "assistant", icon: Sparkles, permission: "ASSISTANT_USE" }],
  },
  {
    label: "admin",
    items: [
      { to: "/app/users", key: "users", icon: Shield, permission: "USERS_MANAGE" },
      { to: "/app/audit", key: "audit", icon: ScrollText, permission: "AUDIT_VIEW" },
      { to: "/app/holidays", key: "holidays", icon: CalendarDays, permission: "SETTINGS_MANAGE" },
      { to: "/app/settings", key: "settings", icon: Settings, permission: "SETTINGS_MANAGE" },
    ],
  },
];

export const employeeNav: NavItem[] = [
  { to: "/portal", key: "portalHome", icon: LayoutDashboard },
  { to: "/portal/leave", key: "myLeave", icon: Palmtree, permission: "LEAVE_VIEW" },
  { to: "/portal/attendance", key: "myAttendance", icon: CalendarCheck },
  { to: "/portal/profile", key: "myProfile", icon: PenLine },
  { to: "/portal/payslips", key: "myPayslips", icon: Receipt, permission: "PAYSLIPS_VIEW_OWN" },
  { to: "/portal/documents", key: "myDocuments", icon: FolderOpen, permission: "DOCUMENTS_VIEW" },
  { to: "/portal/announcements", key: "announcements", icon: Megaphone, permission: "ANNOUNCEMENTS_VIEW" },
  { to: "/portal/requests", key: "requests", icon: ClipboardList, permission: "REQUESTS_CREATE" },
  { to: "/portal/expenses", key: "expenses", icon: Wallet, permission: "EXPENSES_VIEW" },
  { to: "/portal/trips", key: "trips", icon: Plane, permission: "EXPENSES_VIEW" },
  { to: "/portal/onboarding", key: "onboarding", icon: UserPlus },
  { to: "/portal/offboarding", key: "offboarding", icon: UserMinus },
  { to: "/portal/reviews", key: "reviews", icon: Star },
  { to: "/portal/objectives", key: "objectives", icon: Target },
  { to: "/portal/assistant", key: "assistant", icon: Sparkles, permission: "ASSISTANT_USE" },
];

export const platformNav: NavItem[] = [
  { to: "/platform", key: "platform", icon: Building },
  { to: "/platform/tenants", key: "tenants", icon: Building2 },
];

export function visibleItems(user: AuthUser | null, items: NavItem[]) {
  return items.filter((item) => {
    if (item.roles && !item.roles.includes(normalizeRole(user?.role))) return false;
    if (!item.permission) return true;
    return hasPermission(user, item.permission);
  });
}
