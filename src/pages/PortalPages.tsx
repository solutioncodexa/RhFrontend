import { Link } from "react-router-dom";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DonutChart, TrendChart, useCountUp } from "@/components/DashboardCharts";
import { toast } from "sonner";
import { apiFetch, uploadImage } from "@/lib/api";
import { asRecord, moneyMAD } from "@/lib/utils";
import { Button, Card, PageHeader } from "@/components/ui";
import { ImageWell } from "@/components/ImageWell";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { LeaveRequestsPage } from "./LeavePages";
import { AttendancePage, AnnouncementsPage, DocumentsPage, ExpensesPage, NotificationsPage, ObjectivesPage, OffboardingPage, OnboardingPage, PayslipsPage, RequestsPage, ReviewsPage, TripsPage } from "./CatalogPages";
import { AssistantPage } from "@/components/AssistantPanel";
import { ProfileChangesPage } from "./CyclePages";

function slices(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = asRecord(item);
    return { label: String(row.label ?? ""), value: Number(row.value) || 0 };
  });
}

function PortalStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="dash-rise">
      <p className="text-xs text-indigo-400">{label}</p>
      <p className="text-2xl font-bold text-indigo-950">{value}</p>
    </Card>
  );
}

export function PortalHome() {
  const { tr } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [photoStamp, setPhotoStamp] = useState(0);
  const [photoBusy, setPhotoBusy] = useState(false);
  const selfId = user?.employeeId ? String(user.employeeId) : "";
  const dash = useQuery({ queryKey: ["dashboard-me", user?.id], queryFn: () => apiFetch<Record<string, unknown>>("/dashboard") });
  const d = asRecord(dash.data);
  const charts = asRecord(d.charts);
  const leave = useCountUp(Number(d.leaveBalance ?? d.remainingLeave) || 0);
  const points = Array.isArray(charts.attendanceTrend)
    ? charts.attendanceTrend.map((item) => {
        const row = asRecord(item);
        return {
          label: String(row.label ?? ""),
          present: Number(row.present) || 0,
          late: Number(row.late) || 0,
          absent: Number(row.absent) || 0,
          leave: Number(row.leave) || 0,
        };
      })
    : [];
  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title={`Bonjour ${user?.firstName ?? ""}`}
        subtitle="Votre espace : solde, présences et dernier bulletin."
      />
      {selfId ? (
        <ImageWell
          label="Photo"
          path={`/employees/${selfId}/photo`}
          stamp={photoStamp}
          maxEdge={800}
          busy={photoBusy}
          onFile={(file) => {
            setPhotoBusy(true);
            uploadImage(`/employees/${selfId}/photo`, file)
              .then(() => {
                toast.success("Photo enregistrée");
                setPhotoStamp((n) => n + 1);
                qc.invalidateQueries({ queryKey: ["employee", selfId] });
              })
              .catch((e: Error) => toast.error(e.message))
              .finally(() => setPhotoBusy(false));
          }}
        />
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <PortalStat label={tr("Solde annuel")} value={Number.isFinite(leave) ? leave.toFixed(leave % 1 ? 1 : 0) : "—"} />
        <PortalStat label={tr("Dernier net")} value={d.lastNet != null ? moneyMAD(Number(d.lastNet)) : "—"} />
      </div>
      <Card className="dash-rise">
        <h2 className="mb-3 font-semibold text-indigo-950">{tr("Mes présences du mois")}</h2>
        <DonutChart slices={slices(charts.attendanceMix)} />
      </Card>
      <Card className="dash-rise">
        <h2 className="mb-3 font-semibold text-indigo-950">{tr("14 derniers jours")}</h2>
        <TrendChart points={points} />
      </Card>
      <div className="grid gap-2">
        {[
          ["/portal/leave", "Déposer un congé"],
          ["/portal/attendance", "Mes présences"],
          ["/portal/payslips", "Mes bulletins"],
          ["/portal/documents", "Mes documents"],
          ["/portal/announcements", "Annonces"],
          ["/portal/requests", "Attestation"],
        ].map(([to, label]) => (
          <Link key={to} to={to}>
            <Button className="w-full justify-between" variant="outline">
              {label}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function PortalLeave() {
  return <LeaveRequestsPage />;
}
export function PortalAttendance() {
  return <AttendancePage own />;
}
export function PortalProfile() {
  return <ProfileChangesPage portal />;
}
export function PortalPayslips() {
  return <PayslipsPage />;
}
export function PortalDocuments() {
  return <DocumentsPage />;
}
export function PortalAnnouncements() {
  return <AnnouncementsPage />;
}
export function PortalNotifications() {
  return <NotificationsPage />;
}
export function PortalRequests() {
  return <RequestsPage />;
}
export function PortalExpenses() {
  return <ExpensesPage />;
}
export function PortalTrips() {
  return <TripsPage />;
}
export function PortalOnboarding() {
  return <OnboardingPage />;
}
export function PortalOffboarding() {
  return <OffboardingPage />;
}
export function PortalReviews() {
  return <ReviewsPage />;
}
export function PortalObjectives() {
  return <ObjectivesPage />;
}
export function PortalAssistant() {
  return <AssistantPage />;
}
