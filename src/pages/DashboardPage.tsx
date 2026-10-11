import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { CalendarCheck, FileClock, Palmtree, Receipt, UserRound, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { BarList, DonutChart, PresenceRing, TrendChart, useCountUp, type Slice } from "@/components/DashboardCharts";
import { Button, Card, ErrorState, Spinner, statusTone, Badge } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/api";
import { hasPermission, normalizeRole } from "@/lib/types";
import { asRecord, moneyMAD } from "@/lib/utils";

type Dash = Record<string, unknown>;

function n(v: unknown) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function slices(value: unknown): Slice[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = asRecord(item);
    return { label: String(row.label ?? ""), value: n(row.value) };
  });
}

function trend(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = asRecord(item);
    return {
      label: String(row.label ?? ""),
      present: n(row.present),
      late: n(row.late),
      absent: n(row.absent),
      leave: n(row.leave),
    };
  });
}

function when(value: unknown) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function Stat({ label, value, hint, icon, to, delay }: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  to: string;
  delay: number;
}) {
  const { tr } = useI18n();
  return (
    <Link to={to} className="dash-rise block" style={{ animationDelay: `${delay}ms` }}>
        <Card className="h-full transition duration-200 hover:border-indigo-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400">{tr(label)}</p>
            <p className="mt-2 text-2xl font-bold text-indigo-950">{value}</p>
            {hint ? <p className="mt-1 text-xs text-indigo-400">{tr(hint)}</p> : null}
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-700">{icon}</span>
        </div>
      </Card>
    </Link>
  );
}

function CountStat({
  amount,
  suffix = "",
  digits,
  ...rest
}: Omit<Parameters<typeof Stat>[0], "value"> & { amount: number; suffix?: string; digits?: number }) {
  const shown = useCountUp(amount);
  const text = digits ? shown.toFixed(digits) : String(Math.round(shown));
  return <Stat {...rest} value={`${text}${suffix}`} />;
}

export function DashboardPage() {
  const { user } = useAuth();
  const { tr } = useI18n();
  const role = normalizeRole(user?.role);
  const q = useQuery({ queryKey: ["dashboard", user?.id], queryFn: () => apiFetch<Dash>("/dashboard") });
  const d = asRecord(q.data);
  const charts = asRecord(d.charts);
  const payroll = hasPermission(user, "PAYROLL_VIEW");
  const canHire = hasPermission(user, "EMPLOYEES_CREATE");
  const scope = String(d.scope ?? (role === "MANAGER" ? "team" : "company"));
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const headcount = n(d.headcount ?? d.totalEmployees);
  const rate = n(d.attendanceRate);

  return (
    <div className="pb-8">
      <section className="role-hero dash-rise overflow-hidden rounded-3xl p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-sm capitalize text-indigo-100">{today}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">{tr(`Bonjour ${user?.firstName || ""}`.trim())}</h1>
            <p className="mt-2 max-w-xl text-sm text-indigo-100">
              {tr(scope === "team"
                ? "Les indicateurs et diagrammes portent sur votre équipe."
                : "Vue d’ensemble de la société : effectif, présences, congés et paie.")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {canHire ? <Link to="/app/employees"><Button size="sm" className="bg-white text-[var(--role-accent)] hover:bg-zinc-100">Ajouter un employé</Button></Link> : null}
              <Link to="/app/leave-requests"><Button size="sm" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">Congés</Button></Link>
              <Link to="/app/attendance"><Button size="sm" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">Présence</Button></Link>
              <Link to="/app/announcements"><Button size="sm" className="bg-white text-[var(--role-accent)] hover:bg-zinc-100">Annonce</Button></Link>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-white/10 px-4 py-3">
            <PresenceRing rate={rate} />
            <div>
              <p className="text-xs uppercase tracking-wide text-indigo-100">{tr("Présence du mois")}</p>
              <p className="text-lg font-semibold">{tr(`${n(d.absentToday)} absent${n(d.absentToday) > 1 ? "s" : ""} aujourd’hui`)}</p>
              <p className="text-sm text-indigo-100">{tr(`${n(d.onLeaveToday)} en congé`)}</p>
            </div>
          </div>
        </div>
      </section>

      {q.isLoading ? <Spinner variant="dashboard" /> : null}
      {q.isError ? <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} /> : null}

      {q.data ? (
      <>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CountStat delay={40} label={scope === "team" ? "Équipe" : "Effectif"} amount={headcount} hint={`${n(d.activeEmployees)} actif${n(d.activeEmployees) > 1 ? "s" : ""}`} icon={<Users className="h-5 w-5" />} to="/app/employees" />
        <CountStat delay={90} label="Absents aujourd’hui" amount={n(d.absentToday)} icon={<UserRound className="h-5 w-5" />} to="/app/attendance" />
        <CountStat delay={140} label="Congés en attente" amount={n(d.pendingLeaves)} icon={<Palmtree className="h-5 w-5" />} to="/app/leave-requests" />
        <CountStat delay={190} label="Contrats à 30 j" amount={n(d.expiringContracts)} icon={<FileClock className="h-5 w-5" />} to="/app/contracts" />
        {payroll ? (
          <Stat
            delay={240}
            label="Coût employeur"
            value={moneyMAD(n(d.employerCost))}
            hint={d.currentPayrollPeriod ? String(d.currentPayrollPeriod) : undefined}
            icon={<Receipt className="h-5 w-5" />}
            to="/app/payslips"
          />
        ) : null}
        <CountStat delay={290} label="Demandes RH" amount={n(d.pendingRequests)} icon={<CalendarCheck className="h-5 w-5" />} to="/app/requests" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="dash-rise lg:col-span-3" >
          <h2 className="font-semibold text-indigo-950">{tr("Présences sur 8 semaines")}</h2>
          <p className="mb-3 text-sm text-indigo-400">{tr(scope === "team" ? "Votre équipe, semaine par semaine." : "Toute la société, semaine par semaine.")}</p>
          <TrendChart points={trend(charts.attendanceTrend)} />
        </Card>
        <Card className="dash-rise lg:col-span-2" >
          <h2 className="mb-3 font-semibold text-indigo-950">{tr("Répartition du mois")}</h2>
          <DonutChart slices={slices(charts.attendanceMix)} center={`${rate.toFixed(0)}%`} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="dash-rise">
          <h2 className="mb-3 font-semibold text-indigo-950">{tr("Effectif dans le temps")}</h2>
          <BarList slices={slices(charts.headcountTrend)} />
        </Card>
        <Card className="dash-rise">
          <h2 className="mb-3 font-semibold text-indigo-950">{tr(scope === "team" ? "Équipe par département" : "Effectif par département")}</h2>
          <BarList slices={slices(charts.departments)} />
        </Card>
        <Card className="dash-rise">
          <h2 className="mb-3 font-semibold text-indigo-950">{tr("Contrats actifs")}</h2>
          <DonutChart slices={slices(charts.contracts)} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="dash-rise">
          <h2 className="mb-3 font-semibold text-indigo-950">{tr("Congés")}</h2>
          <BarList slices={slices(charts.leaves)} />
        </Card>
      </div>

      {payroll ? (
        <Card className="dash-rise mt-4">
          <h2 className="font-semibold text-indigo-950">{tr("Charges patronales du mois")}</h2>
          <p className="mb-3 text-sm text-indigo-400">{tr("CNSS, AMO et taxes, à partir des bulletins déjà calculés.")}</p>
          <BarList slices={slices(charts.charges)} money />
        </Card>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="dash-rise">
          <h2 className="font-semibold text-indigo-950">{tr("Activité récente")}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(Array.isArray(d.recentActivity) ? d.recentActivity : []).slice(0, 8).map((item, i) => {
              const row = asRecord(item);
              return (
                <li key={i} className="flex items-center justify-between gap-3 border-b border-indigo-50 pb-2">
                  <span className="text-indigo-950">{tr(String(row.message ?? "Événement").replaceAll("-", " "))}</span>
                  <span className="shrink-0 text-indigo-400">{when(row.createdAt)}</span>
                </li>
              );
            })}
            {!Array.isArray(d.recentActivity) || d.recentActivity.length === 0 ? (
              <li className="text-indigo-400">{tr("Aucun événement récent.")}</li>
            ) : null}
          </ul>
        </Card>
        <Card className="dash-rise">
          <h2 className="font-semibold text-indigo-950">{tr("Contrats à échéance")}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(Array.isArray(d.expiringContractList) ? d.expiringContractList : []).map((item, i) => {
              const row = asRecord(item);
              return (
                <li key={i} className="flex items-center justify-between gap-2">
                  <span>
                    <span className="font-medium text-indigo-950">{tr(String(row.employeeName ?? "Salarié"))}</span>
                    {row.type ? <span className="ms-2 text-indigo-400">{String(row.type)}</span> : null}
                  </span>
                  <Badge tone={statusTone(String(row.alert ?? "EXPIRING"))}>{String(row.endDate ?? "")}</Badge>
                </li>
              );
            })}
            {!Array.isArray(d.expiringContractList) || d.expiringContractList.length === 0 ? (
              <li className="text-indigo-400">{tr("Aucun contrat n’arrive à échéance dans les 90 jours.")}</li>
            ) : null}
          </ul>
        </Card>
      </div>
      </>
      ) : null}
    </div>
  );
}
