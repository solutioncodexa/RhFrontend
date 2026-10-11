import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, apiFetchBlob, createResource, downloadNamed, listResource } from "@/lib/api";
import { asRecord, fullName, idOf, moneyMAD, scrollContentTop } from "@/lib/utils";
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Spinner, statusTone } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { SearchableSelect } from "@/components/SearchableSelect";
import { ColumnFilter } from "@/components/ColumnFilter";
import { hasPermission } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export function PayrollPage() {
  const { tr } = useI18n();
  const { user } = useAuth();
  const canEdit = hasPermission(user, "PAYROLL_EDIT");
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [selected, setSelected] = useState<string | null>(null);
  const [vars, setVars] = useState({
    overtimeHoursDay: "0",
    overtimeHoursNight: "0",
    overtimeHoursRest: "0",
    overtimeHoursNoComp: "0",
    advances: "0",
    garnishments: "0",
    declaredDays: "26",
  });
  const [item, setItem] = useState({ employeeId: "", kind: "PRIME_CNSS", label: "", amount: "" });
  const [credit, setCredit] = useState({ employeeId: "", amount: "", reason: "" });

  const periods = useQuery({
    queryKey: ["payroll-periods"],
    queryFn: () => listResource<Record<string, unknown>>("/payroll/periods", { page: 0, size: 24 }),
  });

  const detail = useQuery({
    queryKey: ["payroll-period", selected],
    enabled: Boolean(selected),
    queryFn: () => apiFetch<Record<string, unknown>>(`/payroll/periods/${selected}`),
  });
  const elements = useQuery({
    queryKey: ["payroll-elements", selected],
    enabled: Boolean(selected),
    queryFn: () => apiFetch<Record<string, unknown>>(`/payroll/periods/${selected}/elements`),
  });
  const staff = useQuery({
    queryKey: ["payroll-staff"],
    queryFn: () => listResource<Record<string, unknown>>("/employees", { page: 0, size: 200 }),
  });
  const addItem = useMutation({
    mutationFn: () => apiFetch("/payroll/items", {
      method: "POST",
      body: JSON.stringify({
        employeeId: Number(item.employeeId),
        year: Number(asRecord(detail.data).year),
        month: Number(asRecord(detail.data).month),
        kind: item.kind,
        label: item.label,
        amount: Number(item.amount),
      }),
    }),
    onSuccess: () => {
      toast.success("Élément lié au salarié");
      setItem({ ...item, label: "", amount: "" });
      qc.invalidateQueries({ queryKey: ["payroll-elements", selected] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeItem = useMutation({
    mutationFn: (id: string) => apiFetch(`/payroll/items/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payroll-elements", selected] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: () => createResource("/payroll/periods", { year: Number(year), month: Number(month) }),
    onSuccess: () => {
      toast.success("Période ouverte");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["payroll-periods"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const calculate = useMutation({
    mutationFn: () => apiFetch(`/payroll/periods/${selected}/calculate`, { method: "POST", body: JSON.stringify({
      overtimeHoursDay: Number(vars.overtimeHoursDay) || 0,
      overtimeHoursNight: Number(vars.overtimeHoursNight) || 0,
      overtimeHoursRest: Number(vars.overtimeHoursRest) || 0,
      overtimeHoursNoComp: Number(vars.overtimeHoursNoComp) || 0,
      advances: Number(vars.advances) || 0,
      garnishments: Number(vars.garnishments) || 0,
      declaredDays: Number(vars.declaredDays) || 26,
    }) }),
    onSuccess: () => {
      toast.success("Calcul effectué");
      qc.invalidateQueries({ queryKey: ["payroll-period", selected] });
      qc.invalidateQueries({ queryKey: ["payroll-elements", selected] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approve = useMutation({
    mutationFn: () => apiFetch(`/payroll/periods/${selected}/approve`, { method: "POST", body: "{}" }),
    onSuccess: () => {
      toast.success("Période approuvée");
      qc.invalidateQueries({ queryKey: ["payroll-period", selected] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const paid = useMutation({
    mutationFn: () => apiFetch(`/payroll/periods/${selected}/paid`, { method: "POST", body: "{}" }),
    onSuccess: () => {
      toast.success("Période marquée payée");
      qc.invalidateQueries({ queryKey: ["payroll-period", selected] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const creditMut = useMutation({
    mutationFn: () => apiFetch(`/payroll/periods/${selected}/credit`, { method: "POST", body: JSON.stringify({
      employeeId: Number(credit.employeeId),
      amount: Number(credit.amount),
      reason: credit.reason,
    }) }),
    onSuccess: () => {
      toast.success("Avoir enregistré pour le mois suivant");
      qc.invalidateQueries({ queryKey: ["payroll-period", selected] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lock = useMutation({
    mutationFn: () => apiFetch(`/payroll/periods/${selected}/lock`, { method: "POST", body: "{}" }),
    onSuccess: (data) => {
      const sent = Number((data as { bulletinsSent?: number })?.bulletinsSent ?? 0);
      const mailOn = Boolean((data as { mailEnabled?: boolean })?.mailEnabled);
      toast.success(mailOn ? `Période verrouillée. ${sent} bulletin(s) envoyé(s).` : "Période verrouillée. L’envoi e-mail est inactif : les bulletins restent au téléchargement.");
      qc.invalidateQueries({ queryKey: ["payroll-period", selected] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const d = asRecord(detail.data);
  const lines = (Array.isArray(d.lines) ? d.lines : Array.isArray(d.payslips) ? d.payslips : []) as Record<string, unknown>[];

  return (
    <div>
      <PageHeader
        title="Périodes de paie"
        subtitle="CNSS plafonnée, AMO, IR, prime d’ancienneté — montants en MAD"
        actions={canEdit ? <Button onClick={() => setOpen(true)}>Ouvrir un mois</Button> : null}
      />
      {periods.isLoading ? <Spinner /> : null}
      {periods.isError ? <ErrorState message={(periods.error as Error).message} onRetry={() => periods.refetch()} /> : null}
      <div className="grid gap-3 md:grid-cols-3">
        {(periods.data?.content ?? []).map((p) => (
          <button key={idOf(p)} onClick={() => setSelected(idOf(p))} className="text-start">
            <Card className={selected === idOf(p) ? "ring-2 ring-violet-500" : ""}>
              <p className="font-bold">
                {String(p.month ?? "")}/{String(p.year ?? "")}
              </p>
              <Badge tone={statusTone(String(p.status))}>{String(p.status ?? "DRAFT")}</Badge>
            </Card>
          </button>
        ))}
      </div>
      {periods.data?.content.length === 0 ? <EmptyState title="Aucune période" hint="Ouvrez un mois pour calculer la paie." /> : null}

      {selected ? (
        <Card className="mt-6">
          {canEdit ? (
            <>
            <p className="mb-3 text-sm text-indigo-700">
              Chaque absence pointée, congé validé, prime et indemnité est rattachée au salarié. Le calcul les met sur son bulletin, et le virement reprend ce net.
            </p>
            <div className="mb-4 grid gap-3 sm:grid-cols-4">
              <Field label="HS jour (h)">
                <Input value={vars.overtimeHoursDay} onChange={(e) => setVars({ ...vars, overtimeHoursDay: e.target.value })} />
              </Field>
              <Field label="HS nuit (h)">
                <Input value={vars.overtimeHoursNight} onChange={(e) => setVars({ ...vars, overtimeHoursNight: e.target.value })} />
              </Field>
              <Field label="HS repos (h)">
                <Input value={vars.overtimeHoursRest} onChange={(e) => setVars({ ...vars, overtimeHoursRest: e.target.value })} />
              </Field>
              <Field label="HS sans repos (h)">
                <Input value={vars.overtimeHoursNoComp} onChange={(e) => setVars({ ...vars, overtimeHoursNoComp: e.target.value })} />
              </Field>
              <Field label="Acomptes">
                <Input value={vars.advances} onChange={(e) => setVars({ ...vars, advances: e.target.value })} />
              </Field>
              <Field label="Saisies">
                <Input value={vars.garnishments} onChange={(e) => setVars({ ...vars, garnishments: e.target.value })} />
              </Field>
              <Field label="Jours déclarés">
                <Input value={vars.declaredDays} onChange={(e) => setVars({ ...vars, declaredDays: e.target.value })} />
              </Field>
            </div>
            </>
          ) : null}
          <div className="mb-4 flex flex-wrap gap-2">
            {canEdit ? (
              <Button onClick={() => calculate.mutate()} disabled={calculate.isPending}>
                Calculer
              </Button>
            ) : null}
            {canEdit && String(d.status) === "CALCULATED" ? (
              <Button variant="outline" onClick={() => approve.mutate()}>
                Approuver
              </Button>
            ) : null}
            {canEdit && String(d.status) === "APPROVED" ? (
              <Button variant="outline" onClick={() => paid.mutate()}>
                Marquer payé
              </Button>
            ) : null}
            {canEdit && String(d.status) !== "LOCKED" ? (
              <Button variant="outline" onClick={() => lock.mutate()}>
                Verrouiller et envoyer les bulletins
              </Button>
            ) : null}
            {lines.length > 0 ? (
              <Button
                variant="outline"
                onClick={() =>
                  downloadNamed(
                    `/reports/virement?year=${String(d.year ?? "")}&month=${String(d.month ?? "")}`,
                    `virement-${String(d.month ?? "")}-${String(d.year ?? "")}.csv`,
                  ).catch((e: Error) => toast.error(e.message))
                }
              >
                Fichier de virement du mois
              </Button>
            ) : null}
          </div>
          {canEdit && String(d.status) === "LOCKED" ? (
            <div className="mb-4 grid gap-3 sm:grid-cols-4">
              <Field label="Employé">
                <SearchableSelect
                  value={credit.employeeId}
                  onChange={(v) => setCredit({ ...credit, employeeId: v })}
                  placeholder="Employé du mois"
                  searchPlaceholder="Nom"
                  options={lines.map((line) => ({
                    value: String(line.employeeId ?? idOf(asRecord(line.employee))),
                    label: fullName(asRecord(line.employee)),
                  }))}
                />
              </Field>
              <Field label="Avoir MAD">
                <Input value={credit.amount} onChange={(e) => setCredit({ ...credit, amount: e.target.value })} />
              </Field>
              <Field label="Motif">
                <Input value={credit.reason} onChange={(e) => setCredit({ ...credit, reason: e.target.value })} />
              </Field>
              <div className="flex items-end">
                <Button variant="outline" onClick={() => creditMut.mutate()}>Enregistrer l’avoir</Button>
              </div>
            </div>
          ) : null}
          {detail.isLoading ? <Spinner /> : null}
          <div className="mb-4 rounded-xl border border-indigo-100 p-3">
            <p className="mb-2 font-semibold">Primes, indemnités et absences du salarié</p>
            {canEdit ? (
              <div className="grid gap-3 sm:grid-cols-5">
                <Field label="Salarié">
                  <SearchableSelect
                    value={item.employeeId}
                    onChange={(v) => setItem({ ...item, employeeId: v })}
                    placeholder="Salarié"
                    searchPlaceholder="Nom"
                    options={(staff.data?.content ?? []).map((person) => ({ value: idOf(person), label: fullName(person) }))}
                  />
                </Field>
                <Field label="Type">
                  <select className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm" value={item.kind} onChange={(e) => setItem({ ...item, kind: e.target.value })}>
                    <option value="PRIME_CNSS">Prime soumise CNSS</option>
                    <option value="PRIME_IR">Prime soumise IR</option>
                    <option value="INDEMNITE">Indemnité</option>
                    <option value="ABSENCE">Absence à déduire</option>
                  </select>
                </Field>
                <Field label="Libellé">
                  <Input value={item.label} onChange={(e) => setItem({ ...item, label: e.target.value })} />
                </Field>
                <Field label="Montant MAD">
                  <Input value={item.amount} onChange={(e) => setItem({ ...item, amount: e.target.value })} />
                </Field>
                <div className="flex items-end">
                  <Button variant="outline" onClick={() => addItem.mutate()} disabled={!item.employeeId || !item.label.trim() || !item.amount}>Lier au bulletin</Button>
                </div>
              </div>
            ) : null}
            <ul className="mt-3 space-y-2 text-sm">
              {((elements.data?.people as Record<string, unknown>[] | undefined) ?? []).map((person) => (
                <li key={String(person.employeeId)} className="rounded-lg bg-indigo-50 px-3 py-2">
                  <span className="font-semibold">{fullName(asRecord(person.employee))}</span>
                  <span className="text-indigo-800"> — {String(person.note ?? "")}</span>
                </li>
              ))}
              {((elements.data?.items as Record<string, unknown>[] | undefined) ?? []).map((row) => (
                <li key={String(row.id)} className="flex items-center justify-between gap-2">
                  <span>{fullName(asRecord(row.employee))} · {String(row.label)} · {moneyMAD(Number(row.amount ?? 0))}</span>
                  {canEdit ? <Button size="sm" variant="ghost" onClick={() => removeItem.mutate(String(row.id))}>Retirer</Button> : null}
                </li>
              ))}
            </ul>
            {(elements.data?.people as unknown[] | undefined)?.length || (elements.data?.items as unknown[] | undefined)?.length ? null : (
              <p className="mt-2 text-sm text-indigo-500">Aucun congé, aucune absence, prime ou indemnité sur ce mois pour l’instant.</p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-indigo-50 text-xs uppercase text-indigo-800">
                <tr>
                  <th className="px-3 py-2 text-start">{tr("Employé")}</th>
                  <th className="px-3 py-2 text-end">{tr("Base")}</th>
                  <th className="px-3 py-2 text-end">{tr("Primes")}</th>
                  <th className="px-3 py-2 text-end">{tr("Retenues")}</th>
                  <th className="px-3 py-2 text-end">{tr("Absences")}</th>
                  <th className="px-3 py-2 text-end">{tr("Net")}</th>
                  <th className="px-3 py-2 text-start">PDF</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const id = idOf(line);
                  const pdf = String(line.pdfUrl ?? line.pdfPath ?? "");
                  return (
                    <tr key={id} className="border-t border-indigo-50">
                      <td className="px-3 py-2">
                        {fullName(asRecord(line.employee) || line)}
                        {line.linkNote ? <p className="text-xs text-indigo-700">{String(line.linkNote)}</p> : null}
                      </td>
                      <td className="px-3 py-2 text-end">{moneyMAD(Number(line.baseSalary ?? line.base ?? 0))}</td>
                      <td className="px-3 py-2 text-end">{moneyMAD(Number(line.bonuses ?? line.allowances ?? 0))}</td>
                      <td className="px-3 py-2 text-end">{moneyMAD(Number(line.deductions ?? 0))}</td>
                      <td className="px-3 py-2 text-end">{moneyMAD(Number(line.unpaidAbsence ?? 0))}</td>
                      <td className="px-3 py-2 text-end font-semibold">{moneyMAD(Number(line.net ?? line.netPay ?? 0))}</td>
                      <td className="px-3 py-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            downloadNamed(
                              pdf.startsWith("http") ? pdf.replace(/^https?:\/\/[^/]+/, "") : `/payslips/${id}/pdf`,
                              `bulletin-${id}.pdf`,
                            ).catch((e: Error) => toast.error(e.message))
                          }
                        >
                          PDF
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {lines.length === 0 ? <p className="p-4 text-sm text-indigo-500">{tr("Calculez la période pour afficher les lignes.")}</p> : null}
          </div>
        </Card>
      ) : null}

      <Modal
        open={open}
        title="Nouvelle période"
        onClose={() => setOpen(false)}
        footer={<Button onClick={() => create.mutate()}>Créer</Button>}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Année">
            <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
          </Field>
          <Field label="Mois">
            <Input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

export function DeclarationsPage() {
  const { tr } = useI18n();
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const q = `?year=${year}&month=${month}`;
  return (
    <div>
      <PageHeader title="Déclarations" subtitle="Bordereau CNSS, écriture pour le cabinet, virement et registre" />
      <div className="mb-4 grid max-w-md grid-cols-2 gap-3">
        <Field label="Année">
          <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
        </Field>
        <Field label="Mois">
          <Input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(e.target.value)} />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="font-bold">{tr("Damancom")}</h3>
          <p className="mt-2 text-sm text-indigo-700">{tr("Entrées, sorties, jours et salaire déclaré, prêts à déposer.")}</p>
          <Button
            className="mt-4"
            onClick={() => downloadNamed(`/reports/damancom${q}`, "damancom.csv").catch((e: Error) => toast.error(e.message))}
          >
            CSV
          </Button>
          <Button
            className="mt-2 ml-2"
            variant="outline"
            onClick={() => downloadNamed(`/reports/damancom-edi${q}`, "damancom-bds.xml").catch((e: Error) => toast.error(e.message))}
          >
            EDI BDS
          </Button>
        </Card>
        <Card>
          <h3 className="font-bold">{tr("Écriture comptable")}</h3>
          <p className="mt-2 text-sm text-indigo-700">{tr("Journal du mois pour le cabinet : salaires, CNSS, AMO, IR, net.")}</p>
          <Button
            className="mt-4"
            onClick={() => downloadNamed(`/reports/journal${q}`, "journal-paie.csv").catch((e: Error) => toast.error(e.message))}
          >
            Télécharger
          </Button>
        </Card>
        <Card>
          <h3 className="font-bold">{tr("Fichier de virement")}</h3>
          <p className="mt-2 text-sm text-indigo-700">{tr("Un fichier du mois : RIB figé, net, référence. Les RIB manquants sont signalés.")}</p>
          <Button
            className="mt-4"
            onClick={() => downloadNamed(`/reports/virement${q}`, "ordre-virement.csv").catch((e: Error) => toast.error(e.message))}
          >
            CSV
          </Button>
          <Button
            className="mt-2 ml-2"
            variant="outline"
            onClick={() => downloadNamed(`/reports/virement-simt${q}`, "virement-simt.xml").catch((e: Error) => toast.error(e.message))}
          >
            SIMT pain.001
          </Button>
        </Card>
        <Card>
          <h3 className="font-bold">{tr("Registre du personnel")}</h3>
          <p className="mt-2 text-sm text-indigo-700">{tr("Article 135 : identité, emploi, entrée et sortie.")}</p>
          <Button
            className="mt-4"
            onClick={() => downloadNamed("/reports/registre", "registre-personnel.csv").catch((e: Error) => toast.error(e.message))}
          >
            Télécharger
          </Button>
        </Card>
        <Card>
          <h3 className="font-bold">{tr("État 9421")}</h3>
          <p className="mt-2 text-sm text-indigo-700">{tr("Déclaration annuelle DGI.")}</p>
          <Button
            className="mt-4"
            onClick={() => downloadNamed(`/reports/9421?year=${year}`, "etat-9421.pdf").catch((e: Error) => toast.error(e.message))}
          >
            PDF
          </Button>
          <Button
            className="mt-2 ml-2"
            variant="outline"
            onClick={() => downloadNamed(`/reports/9421-edi?year=${year}`, "etat-9421.xml").catch((e: Error) => toast.error(e.message))}
          >
            EDI DGI
          </Button>
        </Card>
        <Card>
          <h3 className="font-bold">{tr("Déclaration CIMR")}</h3>
          <p className="mt-2 text-sm text-indigo-700">{tr("Fichier mensuel des parts salarié et employeur.")}</p>
          <Button
            className="mt-4"
            onClick={() => downloadNamed(`/reports/cimr${q}`, "cimr.csv").catch((e: Error) => toast.error(e.message))}
          >
            Télécharger
          </Button>
        </Card>
      </div>
    </div>
  );
}

export function ReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const items = [
    { id: "headcount", label: "Effectif Excel", path: "/reports/headcount", filename: "effectif.xlsx" },
    { id: "employees-pdf", label: "Effectif PDF", path: "/reports/employees.pdf", filename: "effectif.pdf" },
    { id: "contracts", label: "Contrats Excel", path: "/reports/contracts", filename: "contrats.xlsx" },
    { id: "contracts-pdf", label: "Contrats PDF", path: "/reports/contracts.pdf", filename: "contrats.pdf" },
    { id: "attendance", label: "Présences Excel", path: "/reports/attendance", filename: "presences.xlsx" },
    { id: "attendance-pdf", label: "Présences PDF", path: "/reports/attendance.pdf", filename: "presences.pdf" },
    { id: "leave", label: "Congés Excel", path: "/reports/leave", filename: "conges.xlsx" },
    { id: "leave-pdf", label: "Congés PDF", path: "/reports/leave.pdf", filename: "conges.pdf" },
    { id: "documents", label: "Documents Excel", path: "/reports/documents", filename: "documents.xlsx" },
    { id: "documents-pdf", label: "Documents PDF", path: "/reports/documents.pdf", filename: "documents.pdf" },
    { id: "requests", label: "Demandes Excel", path: "/reports/requests", filename: "demandes.xlsx" },
    { id: "requests-pdf", label: "Demandes PDF", path: "/reports/requests.pdf", filename: "demandes.pdf" },
    { id: "expenses", label: "Notes de frais Excel", path: "/reports/expenses", filename: "notes-de-frais.xlsx" },
    { id: "expenses-pdf", label: "Notes de frais PDF", path: "/reports/expenses.pdf", filename: "notes-de-frais.pdf" },
    { id: "trips", label: "Déplacements Excel", path: "/reports/trips", filename: "deplacements.xlsx" },
    { id: "trips-pdf", label: "Déplacements PDF", path: "/reports/trips.pdf", filename: "deplacements.pdf" },
    { id: "onboarding", label: "Intégration Excel", path: "/reports/onboarding", filename: "integration.xlsx" },
    { id: "onboarding-pdf", label: "Intégration PDF", path: "/reports/onboarding.pdf", filename: "integration.pdf" },
    { id: "offboarding", label: "Départ Excel", path: "/reports/offboarding", filename: "depart.xlsx" },
    { id: "offboarding-pdf", label: "Départ PDF", path: "/reports/offboarding.pdf", filename: "depart.pdf" },
    { id: "reviews", label: "Entretiens Excel", path: "/reports/reviews", filename: "entretiens.xlsx" },
    { id: "reviews-pdf", label: "Entretiens PDF", path: "/reports/reviews.pdf", filename: "entretiens.pdf" },
    { id: "objectives", label: "Objectifs Excel", path: "/reports/objectives", filename: "objectifs.xlsx" },
    { id: "objectives-pdf", label: "Objectifs PDF", path: "/reports/objectives.pdf", filename: "objectifs.pdf" },
    { id: "jobs", label: "Offres Excel", path: "/reports/jobs", filename: "offres.xlsx" },
    { id: "jobs-pdf", label: "Offres PDF", path: "/reports/jobs.pdf", filename: "offres.pdf" },
    { id: "candidates", label: "Candidats Excel", path: "/reports/candidates", filename: "candidats.xlsx" },
    { id: "candidates-pdf", label: "Candidats PDF", path: "/reports/candidates.pdf", filename: "candidats.pdf" },
    { id: "payroll", label: "Livre de paie", path: "/reports/payroll", filename: "livre-paie.csv" },
    { id: "journal", label: "Écriture comptable", path: "/reports/journal", filename: "journal-paie.csv" },
    { id: "damancom", label: "Bordereau Damancom", path: "/reports/damancom", filename: "damancom.csv" },
    { id: "virement", label: "Fichier de virement", path: "/reports/virement", filename: "ordre-virement.csv" },
    { id: "registre", label: "Registre du personnel", path: "/reports/registre", filename: "registre-personnel.csv" },
    { id: "9421", label: "État 9421", path: "/reports/9421", filename: "etat-9421.pdf" },
  ];
  return (
    <div>
      <PageHeader title="Rapports" subtitle="Exports filtrés par année / mois pour la paie" />
      <div className="mb-4 grid max-w-md grid-cols-2 gap-3">
        <Field label="Année">
          <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
        </Field>
        <Field label="Mois">
          <Input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(e.target.value)} />
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {items.map((i) => (
          <Card key={i.id}>
            <h3 className="font-semibold">{i.label}</h3>
            <Button
              className="mt-3"
              size="sm"
              onClick={() =>
                downloadNamed(`${i.path}?year=${year}&month=${month}`, i.filename).catch((e: Error) => toast.error(e.message))
              }
            >
              Exporter
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

const MONTHS = [
  { value: "", label: "Tous les mois" },
  { value: "1", label: "Janvier" },
  { value: "2", label: "Février" },
  { value: "3", label: "Mars" },
  { value: "4", label: "Avril" },
  { value: "5", label: "Mai" },
  { value: "6", label: "Juin" },
  { value: "7", label: "Juillet" },
  { value: "8", label: "Août" },
  { value: "9", label: "Septembre" },
  { value: "10", label: "Octobre" },
  { value: "11", label: "Novembre" },
  { value: "12", label: "Décembre" },
];

function monthLabel(month: unknown, year: unknown) {
  const name = MONTHS.find((m) => m.value === String(month))?.label ?? String(month ?? "");
  return `${name} ${year ?? ""}`.trim();
}

export function PayslipsPage() {
  const { tr } = useI18n();
  const [searchParams] = useSearchParams();
  const employeeId = searchParams.get("employeeId") ?? "";
  const now = new Date();
  const [draft, setDraft] = useState("");
  const [monthDraft, setMonthDraft] = useState(String(now.getMonth() + 1));
  const [yearDraft, setYearDraft] = useState(String(now.getFullYear()));
  const [q, setQ] = useState("");
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [page, setPage] = useState(0);
  const [view, setView] = useState<Record<string, unknown> | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    scrollContentTop();
  }, [page]);

  function searchName() {
    setPage(0);
    setQ(draft.trim());
  }

  function searchPeriod() {
    setPage(0);
    setMonth(monthDraft);
    setYear(yearDraft);
  }

  const list = useQuery({
    queryKey: ["payslips", q, month, year, page, employeeId],
    queryFn: () => listResource<Record<string, unknown>>("/payslips", { q, month, year, page, size: 20, employeeId }),
  });

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  function closeView() {
    setView(null);
    setPdfUrl(null);
  }

  async function openView(row: Record<string, unknown>) {
    setView(row);
    setPdfUrl(null);
    setOpening(true);
    try {
      const blob = await apiFetchBlob(`/payslips/${idOf(row)}/pdf`);
      const pdf = blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
      setPdfUrl(URL.createObjectURL(pdf));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOpening(false);
    }
  }

  function downloadRow(row: Record<string, unknown>) {
    const employee = asRecord(row.employee);
    const name = fullName(employee).replace(/\s+/g, "-").toLowerCase();
    downloadNamed(`/payslips/${idOf(row)}/pdf`, `bulletin-${name}-${row.month}-${row.year}.pdf`).catch((e: Error) =>
      toast.error(e.message),
    );
  }

  const employee = view ? asRecord(view.employee) : null;

  return (
    <div>
      <PageHeader
        title="Bulletins de paie"
        subtitle="Choisissez le mois, puis consultez ou téléchargez le bulletin de chaque employé"
      />
      {list.isLoading && !list.data ? <Spinner /> : null}
      {list.isError ? <ErrorState message={(list.error as Error).message} onRetry={() => list.refetch()} /> : null}
      {list.data ? (
        <div className="overflow-x-auto rounded-2xl border border-indigo-50 bg-white card-shadow">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-indigo-50/70 text-xs uppercase text-indigo-800">
              <tr>
                <th className="px-4 py-3 text-start">
                  <span className="flex items-center gap-1">
                    Employé
                    <ColumnFilter
                      label="Recherche"
                      active={Boolean(q)}
                      onOpen={() => setDraft(q)}
                      onSearch={searchName}
                      onReset={() => {
                        setDraft("");
                        setQ("");
                        setPage(0);
                      }}
                    >
                      <Input value={draft} placeholder="Nom de l’employé" onChange={(e) => setDraft(e.target.value)} />
                    </ColumnFilter>
                  </span>
                </th>
                <th className="px-4 py-3 text-start">
                  <span className="flex items-center gap-1">
                    Période
                    <ColumnFilter
                      label="Période"
                      active={month !== String(now.getMonth() + 1) || year !== String(now.getFullYear())}
                      onOpen={() => {
                        setMonthDraft(month);
                        setYearDraft(year);
                      }}
                      onSearch={searchPeriod}
                      onReset={() => {
                        const m = String(now.getMonth() + 1);
                        const y = String(now.getFullYear());
                        setMonthDraft(m);
                        setYearDraft(y);
                        setMonth(m);
                        setYear(y);
                        setPage(0);
                      }}
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={monthDraft}
                          onChange={(e) => setMonthDraft(e.target.value)}
                          className="h-10 rounded-lg border border-indigo-100 bg-white px-2 text-sm text-indigo-950"
                        >
                          {MONTHS.map((item) => (
                            <option key={item.value || "all"} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                        <Input
                          value={yearDraft}
                          inputMode="numeric"
                          onChange={(e) => setYearDraft(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        />
                      </div>
                    </ColumnFilter>
                  </span>
                </th>
                <th className="px-4 py-3 text-start">{tr("Brut")}</th>
                <th className="px-4 py-3 text-start">{tr("Net")}</th>
                <th className="px-4 py-3 text-start">{tr("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {list.data.content.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-indigo-400">
                    Aucun bulletin pour ces filtres.
                  </td>
                </tr>
              ) : null}
              {list.data.content.map((row) => (
                <tr key={idOf(row)} className="border-t border-indigo-50">
                  <td className="px-4 py-3 font-medium text-indigo-950">{fullName(asRecord(row.employee))}</td>
                  <td className="px-4 py-3">{monthLabel(row.month, row.year)}</td>
                  <td className="px-4 py-3">{moneyMAD(row.gross as number)}</td>
                  <td className="px-4 py-3">{moneyMAD(row.net as number)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openView(row)}>
                        <Eye className="h-4 w-4" />
                        Voir
                      </Button>
                      <Button size="sm" variant="soft" onClick={() => downloadRow(row)}>
                        <Download className="h-4 w-4" />
                        Télécharger
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-indigo-50 px-4 py-3 text-sm text-indigo-700">
            <span>
              Page {list.data.page + 1} / {Math.max(1, list.data.totalPages)} · {list.data.totalElements}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
                Précédent
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page + 1 >= list.data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      <Modal
        wide
        open={view != null}
        title={employee ? `Bulletin — ${fullName(employee)}` : "Bulletin"}
        onClose={closeView}
        footer={
          view ? (
            <Button onClick={() => downloadRow(view)}>
              <Download className="h-4 w-4" />
              Télécharger
            </Button>
          ) : null
        }
      >
        {view ? (
          <div className="space-y-4">
            <p className="text-sm text-indigo-700">{monthLabel(view.month, view.year)}</p>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>{tr("Brut")}</div>
              <div className="text-end font-medium">{moneyMAD(view.gross as number)}</div>
              <div>{tr("CNSS")}</div>
              <div className="text-end">{moneyMAD(view.cnss as number)}</div>
              <div>{tr("AMO")}</div>
              <div className="text-end">{moneyMAD(view.amo as number)}</div>
              <div>{tr("IR")}</div>
              <div className="text-end">{moneyMAD(view.ir as number)}</div>
              <div className="font-semibold">{tr("Net à payer")}</div>
              <div className="text-end font-semibold">{moneyMAD(view.net as number)}</div>
            </dl>
            <div className="relative h-80 overflow-hidden rounded-xl border border-indigo-100 bg-indigo-50">
              {opening ? (
                <div className="absolute inset-0 grid place-items-center">
                  <Spinner />
                </div>
              ) : null}
              {pdfUrl ? (
                <iframe title="Aperçu du bulletin" src={pdfUrl} className="h-full w-full bg-white" />
              ) : !opening ? (
                <p className="grid h-full place-items-center px-6 text-center text-sm text-indigo-500">
                  Aperçu indisponible. Téléchargez le bulletin.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
