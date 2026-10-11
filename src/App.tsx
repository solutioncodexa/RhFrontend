import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AssistantPage } from "./components/AssistantPanel";
import { LandingPage } from "./pages/LandingPage";
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from "./pages/AuthPages";
import { DashboardPage } from "./pages/DashboardPage";
import { LeaveCalendarPage, LeaveRequestsPage } from "./pages/LeavePages";
import { DeclarationsPage, PayrollPage, ReportsPage } from "./pages/PayrollPages";
import { OrgChartPage, ProfileChangesPage, TrainingPage } from "./pages/CyclePages";
import { SettingsPage } from "./pages/SettingsPage";
import {
  AssetsPage,
  CareerPage,
  DisciplinaryPage,
  EstablishmentsPage,
  LoansPage,
  PayrollToolsPage,
  ShiftAssignmentsPage,
  ShiftsPage,
} from "./pages/ExtraPages";
import { PlatformPage } from "./pages/PlatformPage";
import {
  PortalAnnouncements,
  PortalAssistant,
  PortalAttendance,
  PortalDocuments,
  PortalHome,
  PortalLeave,
  PortalPayslips,
  PortalRequests,
  PortalExpenses,
  PortalObjectives,
  PortalOffboarding,
  PortalOnboarding,
  PortalProfile,
  PortalReviews,
  PortalTrips,
} from "./pages/PortalPages";
import {
  AnnouncementsPage,
  AttendancePage,
  AuditPage,
  CandidatesPage,
  ContractsPage,
  DepartmentsPage,
  DocumentsPage,
  EmployeesPage,
  EmployeeFilePage,
  ExpensesPage,
  HolidaysPage,
  JobsPage,
  LeaveBalancesPage,
  ObjectivesPage,
  OffboardingPage,
  OnboardingPage,
  PayslipsPage,
  PositionsPage,
  RequestsPage,
  ReviewsPage,
  TripsPage,
  UsersPage,
  WorkingHoursPage,
} from "./pages/CatalogPages";
import { useAuth } from "./lib/auth";
import { normalizeRole } from "./lib/types";

function AbsencesAliasPage() {
  return <AttendancePage absenceOnly />;
}

export function App() {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/careers" element={<CareerPage />} />
      <Route path="/careers/:slug" element={<CareerPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<AppShell mode="app" />}>
        <Route path="/app" element={<DashboardPage />} />
        <Route path="/app/employees" element={<EmployeesPage />} />
        <Route path="/app/employees/:id" element={<EmployeeFilePage />} />
        <Route path="/app/org" element={<OrgChartPage />} />
        <Route path="/app/profile-changes" element={<ProfileChangesPage />} />
        <Route path="/app/training" element={<TrainingPage />} />
        <Route path="/app/departments" element={<DepartmentsPage />} />
        <Route path="/app/positions" element={<PositionsPage />} />
        <Route path="/app/contracts" element={<ContractsPage />} />
        <Route path="/app/attendance" element={<AttendancePage />} />
        <Route path="/app/absences" element={<AbsencesAliasPage />} />
        <Route path="/app/working-hours" element={<WorkingHoursPage />} />
        <Route path="/app/establishments" element={<EstablishmentsPage />} />
        <Route path="/app/shifts" element={<ShiftsPage />} />
        <Route path="/app/shift-assignments" element={<ShiftAssignmentsPage />} />
        <Route path="/app/loans" element={<LoansPage />} />
        <Route path="/app/payroll-tools" element={<PayrollToolsPage />} />
        <Route path="/app/assets" element={<AssetsPage />} />
        <Route path="/app/disciplinary" element={<DisciplinaryPage />} />
        <Route path="/app/leave-requests" element={<LeaveRequestsPage />} />
        <Route path="/app/leave-balances" element={<LeaveBalancesPage />} />
        <Route path="/app/leave-calendar" element={<LeaveCalendarPage />} />
        <Route path="/app/payroll" element={<PayrollPage />} />
        <Route path="/app/payslips" element={<PayslipsPage />} />
        <Route path="/app/declarations" element={<DeclarationsPage />} />
        <Route path="/app/expenses" element={<ExpensesPage />} />
        <Route path="/app/trips" element={<TripsPage />} />
        <Route path="/app/reviews" element={<ReviewsPage />} />
        <Route path="/app/objectives" element={<ObjectivesPage />} />
        <Route path="/app/jobs" element={<JobsPage />} />
        <Route path="/app/candidates" element={<CandidatesPage />} />
        <Route path="/app/documents" element={<DocumentsPage />} />
        <Route path="/app/requests" element={<RequestsPage />} />
        <Route path="/app/announcements" element={<AnnouncementsPage />} />
        <Route path="/app/notifications" element={<Navigate to="/app" replace />} />
        <Route path="/app/reports" element={<ReportsPage />} />
        <Route path="/app/onboarding" element={<OnboardingPage />} />
        <Route path="/app/offboarding" element={<OffboardingPage />} />
        <Route path="/app/assistant" element={<AssistantPage />} />
        <Route path="/app/users" element={<UsersPage />} />
        <Route path="/app/audit" element={<AuditPage />} />
        <Route path="/app/settings" element={<SettingsPage />} />
        <Route path="/app/holidays" element={<HolidaysPage />} />
      </Route>

      <Route element={<AppShell mode="portal" />}>
        <Route path="/portal" element={<PortalHome />} />
        <Route path="/portal/leave" element={<PortalLeave />} />
        <Route path="/portal/attendance" element={<PortalAttendance />} />
        <Route path="/portal/profile" element={<PortalProfile />} />
        <Route path="/portal/payslips" element={<PortalPayslips />} />
        <Route path="/portal/documents" element={<PortalDocuments />} />
        <Route path="/portal/announcements" element={<PortalAnnouncements />} />
        <Route path="/portal/notifications" element={<Navigate to="/portal" replace />} />
        <Route path="/portal/requests" element={<PortalRequests />} />
        <Route path="/portal/expenses" element={<PortalExpenses />} />
        <Route path="/portal/trips" element={<PortalTrips />} />
        <Route path="/portal/onboarding" element={<PortalOnboarding />} />
        <Route path="/portal/offboarding" element={<PortalOffboarding />} />
        <Route path="/portal/reviews" element={<PortalReviews />} />
        <Route path="/portal/objectives" element={<PortalObjectives />} />
        <Route path="/portal/assistant" element={<PortalAssistant />} />
      </Route>

      <Route element={<AppShell mode="platform" />}>
        <Route path="/platform" element={<PlatformPage />} />
        <Route path="/platform/tenants" element={<PlatformPage />} />
      </Route>

          <Route path="*" element={<Navigate to={role === "SUPER_ADMIN" ? "/platform" : role === "EMPLOYEE" ? "/portal" : "/app"} replace />} />
    </Routes>
  );
}
