import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "@/lib/toast";
import { ResourcePage } from "@/components/ResourcePage";
import { Button, Card, Field, Input, PageHeader, Spinner } from "@/components/ui";
import { apiFetch, downloadNamed } from "@/lib/api";
import { asRecord, moneyMAD } from "@/lib/utils";
import { hasPermission } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

function useCan(code: string) {
  const { user } = useAuth();
  return hasPermission(user, code);
}

export function EstablishmentsPage() {
  return (
    <ResourcePage
      canWrite={useCan("ATTENDANCE_MANAGE")}
      config={{
        path: "/establishments",
        queryKey: "establishments",
        title: "Établissements",
        subtitle: "Sites de pointage GPS (rayon en mètres) et jeton QR.",
        columns: [
          { key: "title", label: "Nom" },
          { key: "code", label: "Jeton QR" },
          { key: "latitude", label: "Lat" },
          { key: "longitude", label: "Lng" },
          { key: "radiusMeters", label: "Rayon" },
        ],
        fields: [
          { key: "title", label: "Nom", required: true },
          { key: "code", label: "Jeton QR" },
          { key: "latitude", label: "Latitude", type: "number" },
          { key: "longitude", label: "Longitude", type: "number" },
          { key: "radiusMeters", label: "Rayon (m)", type: "number" },
        ],
      }}
    />
  );
}

export function ShiftsPage() {
  return (
    <ResourcePage
      canWrite={useCan("ATTENDANCE_MANAGE")}
      config={{
        path: "/shifts",
        queryKey: "shifts",
        title: "Plannings / shifts",
        columns: [
          { key: "title", label: "Nom" },
          { key: "startTime", label: "Début" },
          { key: "endTime", label: "Fin" },
          { key: "relatedName", label: "Établissement" },
        ],
        fields: [
          { key: "title", label: "Nom", required: true },
          { key: "startTime", label: "Début" },
          { key: "endTime", label: "Fin" },
          { key: "relatedId", label: "Établissement", lookup: "establishments" },
        ],
      }}
    />
  );
}

export function ShiftAssignmentsPage() {
  return (
    <ResourcePage
      canWrite={useCan("ATTENDANCE_MANAGE")}
      config={{
        path: "/shift-assignments",
        queryKey: "shift-assignments",
        title: "Affectations de shift",
        columns: [
          { key: "employeeName", label: "Employé" },
          { key: "relatedName", label: "Shift" },
          { key: "startDate", label: "Date" },
        ],
        fields: [
          { key: "employeeId", label: "Employé", lookup: "employees", required: true },
          { key: "relatedId", label: "Shift", lookup: "shifts", required: true },
          { key: "startDate", label: "Date", type: "date", required: true },
        ],
      }}
    />
  );
}

export function LoansPage() {
  return (
    <ResourcePage
      canWrite={useCan("PAYROLL_EDIT")}
      config={{
        path: "/loans",
        queryKey: "loans",
        title: "Prêts salariés",
        subtitle: "L’échéance mensuelle est retenue à la paie jusqu’à solde.",
        columns: [
          { key: "employeeName", label: "Employé" },
          { key: "title", label: "Libellé" },
          { key: "amount", label: "Principal", money: true },
          { key: "monthlyAmount", label: "Mensualité", money: true },
          { key: "remaining", label: "Restant", money: true },
          { key: "status", label: "Statut", status: true },
        ],
        fields: [
          { key: "employeeId", label: "Employé", lookup: "employees", required: true },
          { key: "amount", label: "Principal", type: "number", required: true },
          { key: "monthlyAmount", label: "Mensualité", type: "number", required: true },
          { key: "remaining", label: "Restant", type: "number" },
          { key: "status", label: "Statut", options: [
            { value: "ACTIVE", label: "Actif" },
            { value: "CLOSED", label: "Soldé" },
          ] },
        ],
      }}
    />
  );
}

export function AssetsPage() {
  return (
    <ResourcePage
      canWrite={useCan("EMPLOYEES_EDIT")}
      config={{
        path: "/assets",
        queryKey: "assets",
        title: "Matériel",
        columns: [
          { key: "title", label: "Désignation" },
          { key: "code", label: "N° série" },
          { key: "employeeName", label: "Employé" },
          { key: "status", label: "Statut", status: true },
        ],
        fields: [
          { key: "title", label: "Désignation", required: true },
          { key: "code", label: "N° série" },
          { key: "employeeId", label: "Employé", lookup: "employees" },
          { key: "status", label: "Statut", options: [
            { value: "ASSIGNED", label: "Affecté" },
            { value: "RETURNED", label: "Rendu" },
          ] },
        ],
      }}
    />
  );
}

export function DisciplinaryPage() {
  return (
    <ResourcePage
      canWrite={useCan("EMPLOYEES_EDIT")}
      config={{
        path: "/disciplinary",
        queryKey: "disciplinary",
        title: "Procédures disciplinaires",
        columns: [
          { key: "employeeName", label: "Employé" },
          { key: "title", label: "Type" },
          { key: "status", label: "Statut", status: true },
          { key: "startDate", label: "Date" },
        ],
        fields: [
          { key: "employeeId", label: "Employé", lookup: "employees", required: true },
          { key: "title", label: "Type", required: true },
          { key: "notes", label: "Motif", type: "textarea" },
          { key: "startDate", label: "Date", type: "date" },
          { key: "status", label: "Statut", options: [
            { value: "OPEN", label: "Ouverte" },
            { value: "CLOSED", label: "Clôturée" },
          ] },
        ],
      }}
    />
  );
}

export function PayrollToolsPage() {
  const { tr } = useI18n();
  const { user } = useAuth();
  const can = hasPermission(user, "PAYROLL_VIEW");
  const [net, setNet] = useState("8000");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [employeeId, setEmployeeId] = useState("");
  const sim = useMutation({
    mutationFn: () => apiFetch<Record<string, unknown>>("/payroll/simulate", { method: "POST", body: JSON.stringify({ targetNet: Number(net) }) }),
    onError: (e: Error) => toast.error(e.message),
  });
  const stc = useMutation({
    mutationFn: () => apiFetch<Record<string, unknown>>(`/payroll/settlement/${employeeId}`),
    onError: (e: Error) => toast.error(e.message),
  });
  const ir = useQuery({
    queryKey: ["ir-reg", year],
    enabled: can,
    queryFn: () => apiFetch<Record<string, unknown>[]>(`/payroll/ir-regularize?year=${year}`),
  });
  const simData = asRecord(sim.data);
  const stcData = asRecord(stc.data);
  return (
    <div className="space-y-6">
      <PageHeader title="Outils de paie" subtitle="Simulation net → brut, régularisation IR et solde de tout compte" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="font-bold">{tr("Simulation net vers brut")}</h3>
          <Field label="Net souhaité (MAD)">
            <Input type="number" value={net} onChange={(e) => setNet(e.target.value)} />
          </Field>
          <Button className="mt-3" onClick={() => sim.mutateAsync()} loading={sim.isPending} disabled={sim.isPending}>Simuler</Button>
          {sim.data ? (
            <p className="mt-3 text-sm">
              Brut {moneyMAD(simData.suggestedGross)} · base {moneyMAD(simData.suggestedBase)} · IR {moneyMAD(simData.ir)}
            </p>
          ) : null}
        </Card>
        <Card>
          <h3 className="font-bold">{tr("Solde de tout compte")}</h3>
          <Field label="Id employé">
            <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
          </Field>
          <Button className="mt-3" onClick={() => stc.mutateAsync()} loading={stc.isPending} disabled={!employeeId || stc.isPending}>Calculer</Button>
          {stc.data ? (
            <p className="mt-3 text-sm">Total {moneyMAD(stcData.total)} (net {moneyMAD(stcData.lastNet)} + congés {moneyMAD(stcData.leavePay)})</p>
          ) : null}
        </Card>
      </div>
      <Card>
        <h3 className="font-bold">{tr("Régularisation IR")}</h3>
        <Field label="Année">
          <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
        </Field>
        {ir.isLoading ? <div className="mt-3"><Spinner variant="rows" rows={4} /></div> : null}
        <div className="mt-3 overflow-x-auto text-sm">
          {(ir.data ?? []).map((row) => {
            const r = asRecord(row);
            return (
              <p key={String(r.employeeId)}>
                {String(r.employee)} · payé {moneyMAD(r.irPaid)} · dû {moneyMAD(r.irDue)} · écart {moneyMAD(r.adjustment)}
              </p>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export function OpsStatusPage() {
  const ops = useQuery({
    queryKey: ["ops-status"],
    queryFn: () => apiFetch<Record<string, unknown>>("/ops/status"),
  });
  const d = asRecord(ops.data);
  return (
    <div>
      <PageHeader title="Services" subtitle="Mail, Redis, MinIO, WhatsApp" />
      <pre className="overflow-auto rounded-xl bg-zinc-950 p-4 text-xs text-zinc-100">{JSON.stringify(d, null, 2)}</pre>
    </div>
  );
}

export function CareerPage() {
  const params = useParams();
  const [slug, setSlug] = useState(params.slug || "technova");
  const jobs = useQuery({
    queryKey: ["careers", slug],
    queryFn: () => apiFetch<Record<string, unknown>>(`/careers/${slug}`),
  });
  const apply = useMutation({
    mutationFn: (body: Record<string, string>) =>
      apiFetch(`/careers/${slug}/apply`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => toast.success("Candidature envoyée"),
    onError: (e: Error) => toast.error(e.message),
  });
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", cvText: "", jobOfferId: "" });
  const data = asRecord(jobs.data);
  const list = Array.isArray(data.jobs) ? (data.jobs as Record<string, unknown>[]) : [];
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <PageHeader title="Carrières" subtitle={String(data.company ?? "Offres publiques")} />
      <Field label="Société (slug)">
        <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
      </Field>
      {jobs.isLoading ? <Spinner variant="cards" /> : null}
      {list.map((job) => (
        <Card key={String(job.id)}>
          <h3 className="font-bold">{String(job.title)}</h3>
          <p className="text-sm">{String(job.city ?? "")}</p>
          <p className="mt-2 text-sm whitespace-pre-wrap">{String(job.description ?? "")}</p>
          <Button className="mt-3" variant="outline" onClick={() => setForm({ ...form, jobOfferId: String(job.id) })}>
            Postuler
          </Button>
        </Card>
      ))}
      <Card>
        <h3 className="mb-3 font-bold">Candidature</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Prénom"><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
          <Field label="Nom"><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
          <Field label="E-mail"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Téléphone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        </div>
        <Field label="CV (texte)">
          <textarea className="control-field min-h-28 w-full" value={form.cvText} onChange={(e) => setForm({ ...form, cvText: e.target.value })} />
        </Field>
        <Button className="mt-3" onClick={() => apply.mutateAsync(form)} loading={apply.isPending} disabled={apply.isPending}>Envoyer</Button>
      </Card>
    </div>
  );
}

export function ReportsExtraHint() {
  return (
    <Button variant="outline" onClick={() => downloadNamed("/reports/cimr", "cimr.csv").catch((e: Error) => toast.error(e.message))}>
      CIMR
    </Button>
  );
}
