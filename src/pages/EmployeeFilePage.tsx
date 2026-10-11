import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Download, FilePlus2, Paperclip } from "lucide-react";
import { apiFetch, downloadNamed, getResource, listResource, updateResource, uploadDocument, uploadImage } from "@/lib/api";
import { compressImage } from "@/lib/images";
import { ImageWell } from "@/components/ImageWell";
import { asRecord, fullName, idOf, moneyMAD } from "@/lib/utils";
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Spinner, Textarea, statusTone } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/types";

const TABS = [
  { id: "overview", label: "Aperçu" },
  { id: "coverage", label: "Couverture" },
  { id: "medical", label: "Médical" },
  { id: "payroll", label: "Paie" },
  { id: "documents", label: "Documents" },
  { id: "leave", label: "Congés" },
];

const GENERATED = [
  { type: "ATTESTATION_TRAVAIL", label: "Attestation de travail" },
  { type: "ATTESTATION_SALAIRE", label: "Attestation de salaire" },
  { type: "ATTESTATION_EMPLOI", label: "Attestation d’emploi" },
];

function text(value: unknown) {
  const raw = value == null ? "" : String(value);
  return raw === "undefined" || raw === "null" ? "" : raw;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const { tr } = useI18n();
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium text-[var(--role-muted)]">{tr(label)}</span>
      {children}
    </label>
  );
}

export function EmployeeFilePage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const { tr } = useI18n();
  const [uploading, setUploading] = useState(false);
  const [photoStamp, setPhotoStamp] = useState(0);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState("");
  const [reference, setReference] = useState("");
  const [coverage, setCoverage] = useState({
    cnssNumber: "",
    cnssRegisteredOn: "",
    amoNumber: "",
    insurerName: "",
    insurerPolicy: "",
    insurerStart: "",
    rib: "",
  });
  const [medical, setMedical] = useState({ bloodType: "", medicalNotes: "" });
  const canEdit = hasPermission(user, "EMPLOYEES_EDIT");
  const canMedical = hasPermission(user, "DOCUMENTS_PRIVATE");
  const canPayroll = hasPermission(user, "PAYROLL_VIEW");
  const canPay = hasPermission(user, "PAYROLL_EDIT");
  const canGenerate = hasPermission(user, "DOCUMENTS_UPLOAD");

  const employee = useQuery({
    queryKey: ["employee", id],
    enabled: Boolean(id),
    queryFn: () => getResource<Record<string, unknown>>("/employees", id),
  });
  const contracts = useQuery({
    queryKey: ["employee-contracts", id],
    enabled: Boolean(id),
    queryFn: () => listResource<Record<string, unknown>>("/contracts", { employeeId: id, page: 0, size: 20 }),
  });
  const documents = useQuery({
    queryKey: ["employee-documents", id],
    enabled: Boolean(id),
    queryFn: () => listResource<Record<string, unknown>>("/documents", { employeeId: id, page: 0, size: 50 }),
  });
  const balances = useQuery({
    queryKey: ["employee-balances", id],
    enabled: Boolean(id),
    queryFn: () => listResource<Record<string, unknown>>("/leave-balances", { employeeId: id, page: 0, size: 20 }),
  });
  const payslips = useQuery({
    queryKey: ["employee-payslips", id],
    enabled: Boolean(id) && canPayroll,
    queryFn: () => listResource<Record<string, unknown>>("/payslips", { employeeId: id, page: 0, size: 24 }),
  });

  useEffect(() => {
    const row = employee.data;
    if (!row) return;
    setCoverage({
      cnssNumber: text(row.cnssNumber),
      cnssRegisteredOn: text(row.cnssRegisteredOn),
      amoNumber: text(row.amoNumber),
      insurerName: text(row.insurerName),
      insurerPolicy: text(row.insurerPolicy),
      insurerStart: text(row.insurerStart),
      rib: text(row.rib),
    });
    setMedical({ bloodType: text(row.bloodType), medicalNotes: text(row.medicalNotes) });
  }, [employee.data]);

  async function onFile(file: File | undefined, category: string) {
    if (!file) return;
    setUploading(true);
    try {
      const prepared = await compressImage(file);
      await uploadDocument({
        file: prepared,
        employeeId: id,
        category,
        name: prepared.name,
        visibleToEmployee: category !== "MEDICAL",
      });
      toast.success("Document ajouté");
      qc.invalidateQueries({ queryKey: ["employee-documents", id] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function saveCoverage() {
    setSaving(true);
    try {
      await updateResource("/employees", id, coverage);
      toast.success("Couverture enregistrée");
      qc.invalidateQueries({ queryKey: ["employee", id] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function saveMedical() {
    setSaving(true);
    try {
      await updateResource("/employees", id, medical);
      toast.success("Dossier médical enregistré");
      qc.invalidateQueries({ queryKey: ["employee", id] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function generate(type: string) {
    setGenerating(type);
    try {
      await apiFetch(`/employees/${id}/documents/generate`, { method: "POST", body: JSON.stringify({ type }) });
      toast.success("Document classé dans le dossier");
      qc.invalidateQueries({ queryKey: ["employee-documents", id] });
      setTab("documents");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGenerating("");
    }
  }

  async function markPaid(payslipId: string) {
    try {
      await apiFetch(`/payslips/${payslipId}/transfer`, {
        method: "POST",
        body: JSON.stringify({ reference }),
      });
      toast.success("Virement enregistré");
      setReference("");
      qc.invalidateQueries({ queryKey: ["employee-payslips", id] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (employee.isLoading) return <Spinner />;
  if (employee.isError) return <ErrorState message={(employee.error as Error).message} onRetry={() => employee.refetch()} />;
  const row = employee.data;
  if (!row) return <EmptyState title="Employé introuvable" />;
  const department = asRecord(row.department);
  const position = asRecord(row.position);
  const docs = documents.data?.content ?? [];
  const medicalDocs = docs.filter((doc) => String(doc.category ?? "").toUpperCase().includes("MEDICAL"));
  const otherDocs = docs.filter((doc) => !String(doc.category ?? "").toUpperCase().includes("MEDICAL"));
  const visibleTabs = TABS.filter((item) => item.id !== "payroll" || canPayroll);

  return (
    <div className="space-y-5">
      <PageHeader
        title={fullName(row)}
        subtitle={[text(position.title ?? position.name), text(department.name), text(row.email)].filter(Boolean).join(" · ")}
        actions={<Badge tone={statusTone(text(row.status))}>{text(row.status) || "—"}</Badge>}
      />
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <ImageWell
          label="Photo"
          path={row.hasPhoto === true ? `/employees/${id}/photo` : null}
          stamp={photoStamp}
          maxEdge={800}
          busy={photoBusy}
          onFile={(file) => {
            setPhotoBusy(true);
            uploadImage(`/employees/${id}/photo`, file)
              .then(() => {
                toast.success("Photo enregistrée");
                setPhotoStamp((n) => n + 1);
                qc.invalidateQueries({ queryKey: ["employee", id] });
              })
              .catch((e: Error) => toast.error(e.message))
              .finally(() => setPhotoBusy(false));
          }}
        />
        <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 text-sm md:grid-cols-3">
          <dt className="text-[var(--role-muted)]">{tr("N° CNSS")}</dt>
          <dd className="font-medium">{text(row.cnssNumber) || "—"}</dd>
          <dt className="text-[var(--role-muted)]">{tr("N° AMO")}</dt>
          <dd className="font-medium">{text(row.amoNumber) || "—"}</dd>
          <dt className="text-[var(--role-muted)]">{tr("Assurance médicale")}</dt>
          <dd className="font-medium">{text(row.insurerName) || "—"}</dd>
          <dt className="text-[var(--role-muted)]">RIB</dt>
          <dd className="col-span-1 font-medium md:col-span-1">{text(row.rib) || "—"}</dd>
        </dl>
      </Card>
      <div className="flex flex-wrap gap-2">
        {visibleTabs.map((link) => (
          <button
            key={link.id}
            type="button"
            onClick={() => setTab(link.id)}
            className={`rounded-full border px-3 py-1 text-sm font-medium ${tab === link.id ? "border-[var(--role-accent)] bg-[var(--role-soft)] text-[var(--role-ink)]" : "border-[var(--role-line)] bg-[var(--role-card)] text-[var(--role-muted)]"}`}
          >
            {tr(link.label)}
          </button>
        ))}
        <Link to={`/app/attendance?employeeId=${id}`} className="rounded-full border border-[var(--role-line)] bg-[var(--role-card)] px-3 py-1 text-sm font-medium text-[var(--role-muted)]">
          {tr("Présences")}
        </Link>
      </div>

      {tab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="mb-3 font-semibold">{tr("Identité")}</h2>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-[var(--role-muted)]">{tr("CIN")}</dt><dd>{text(row.cin) || "—"}</dd>
              <dt className="text-[var(--role-muted)]">{tr("Naissance")}</dt><dd>{text(row.birthDate) || "—"}</dd>
              <dt className="text-[var(--role-muted)]">{tr("Nationalité")}</dt><dd>{text(row.nationality) || "—"}</dd>
              <dt className="text-[var(--role-muted)]">{tr("Situation")}</dt><dd>{tr(text(row.maritalStatus) || "—")}</dd>
              <dt className="text-[var(--role-muted)]">{tr("Enfants")}</dt><dd>{text(row.childrenCount ?? row.dependents) || "—"}</dd>
              <dt className="text-[var(--role-muted)]">{tr("Téléphone")}</dt><dd>{text(row.phone) || "—"}</dd>
              <dt className="text-[var(--role-muted)]">{tr("Adresse")}</dt><dd>{text(row.address) || "—"}</dd>
              <dt className="text-[var(--role-muted)]">{tr("Urgence")}</dt>
              <dd>{[row.emergencyName, row.emergencyRelation, row.emergencyPhone].filter(Boolean).map(String).join(" · ") || "—"}</dd>
            </dl>
          </Card>
          <Card>
            <h2 className="mb-3 font-semibold">{tr("Contrat")}</h2>
            {contracts.data?.content.length ? (
              <ul className="space-y-3">
                {contracts.data.content.map((contract) => (
                  <li key={idOf(contract)} className="rounded-xl border border-[var(--role-line)] p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{text(contract.type)}</span>
                      <Badge tone={statusTone(text(contract.status))}>{text(contract.status) || "—"}</Badge>
                    </div>
                    <p className="mt-1">{text(contract.startDate) || "—"} → {text(contract.endDate) || "sans date de fin"}</p>
                    <p>{moneyMAD(contract.baseSalary as number)} · {text(contract.weeklyHours) || "—"} h / semaine</p>
                    <Button className="mt-2" size="sm" variant="outline" onClick={() => downloadNamed(`/contracts/${idOf(contract)}/pdf`, `contrat-${idOf(contract)}.pdf`).catch((e: Error) => toast.error(e.message))}>
                      <Download className="h-4 w-4" />
                      Télécharger
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Aucun contrat" hint="Créez-le depuis Contrats, l’employé est déjà sélectionné." />
            )}
            <Link to={`/app/contracts?employeeId=${id}`} className="mt-3 inline-block text-sm font-semibold text-[var(--role-accent)] hover:underline">
              Gérer les contrats
            </Link>
          </Card>
        </div>
      ) : null}

      {tab === "coverage" ? (
        <Card className="space-y-4">
          <h2 className="font-semibold">{tr("CNSS et AMO")}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="N° CNSS"><Input value={coverage.cnssNumber} disabled={!canEdit} onChange={(e) => setCoverage({ ...coverage, cnssNumber: e.target.value })} /></Field>
            <Field label="Date d’immatriculation"><Input type="date" value={coverage.cnssRegisteredOn} disabled={!canEdit} onChange={(e) => setCoverage({ ...coverage, cnssRegisteredOn: e.target.value })} /></Field>
            <Field label="N° AMO"><Input value={coverage.amoNumber} disabled={!canEdit} onChange={(e) => setCoverage({ ...coverage, amoNumber: e.target.value })} /></Field>
            <Field label="RIB (24)"><Input value={coverage.rib} inputMode="numeric" disabled={!canEdit} onChange={(e) => setCoverage({ ...coverage, rib: e.target.value })} /></Field>
          </div>
          <h2 className="font-semibold">{tr("Assurance médicale")}</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Organisme"><Input value={coverage.insurerName} disabled={!canEdit} onChange={(e) => setCoverage({ ...coverage, insurerName: e.target.value })} /></Field>
            <Field label="N° de police"><Input value={coverage.insurerPolicy} disabled={!canEdit} onChange={(e) => setCoverage({ ...coverage, insurerPolicy: e.target.value })} /></Field>
            <Field label="Date d’effet"><Input type="date" value={coverage.insurerStart} disabled={!canEdit} onChange={(e) => setCoverage({ ...coverage, insurerStart: e.target.value })} /></Field>
          </div>
          {canEdit ? <Button onClick={saveCoverage} disabled={saving}>{saving ? "Envoi…" : "Enregistrer la couverture"}</Button> : null}
        </Card>
      ) : null}

      {tab === "medical" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-3">
            <h2 className="font-semibold">{tr("Dossier médical")}</h2>
            {canMedical ? (
              <>
                <Field label="Groupe sanguin"><Input value={medical.bloodType} disabled={!canEdit} onChange={(e) => setMedical({ ...medical, bloodType: e.target.value })} /></Field>
                <Field label="Notes médicales"><Textarea value={medical.medicalNotes} disabled={!canEdit} onChange={(e) => setMedical({ ...medical, medicalNotes: e.target.value })} /></Field>
                {canEdit ? <Button onClick={saveMedical} disabled={saving}>{saving ? "Envoi…" : "Enregistrer le dossier"}</Button> : null}
              </>
            ) : (
              <p className="text-sm text-[var(--role-muted)]">{tr("Le dossier médical est réservé aux personnes autorisées.")}</p>
            )}
          </Card>
          <Card>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-semibold">{tr("Pièces")}</h2>
              {canMedical ? (
                <label className="inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-[var(--role-accent)]">
                  <Paperclip className="h-4 w-4" />
                  {uploading ? tr("Envoi…") : tr("Ajouter une pièce médicale")}
                  <input type="file" className="sr-only" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,application/pdf,image/*" disabled={uploading} onChange={(e) => onFile(e.target.files?.[0], "MEDICAL")} />
                </label>
              ) : null}
            </div>
            <DocumentList docs={medicalDocs} empty="Aucune pièce médicale" />
          </Card>
        </div>
      ) : null}

      {tab === "payroll" && canPayroll ? (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-semibold">{tr("Bulletins et virements")}</h2>
              <p className="text-sm text-[var(--role-muted)]">RIB {text(row.rib) || "—"}</p>
            </div>
            {canPay ? (
              <Field label="Référence du virement">
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="VIR-2026-10" />
              </Field>
            ) : null}
          </div>
          {payslips.data?.content.length ? (
            <ul className="space-y-3">
              {payslips.data.content.map((slip) => (
                <li key={idOf(slip)} className="rounded-xl border border-[var(--role-line)] p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{text(slip.period)}</span>
                    <Badge tone={text(slip.transferStatus) === "PAID" ? "ok" : "neutral"}>{tr(text(slip.transferStatus) || "PENDING")}</Badge>
                  </div>
                  <p className="mt-1">Net {moneyMAD(slip.net as number)} · Absences {moneyMAD(slip.unpaidAbsence as number)} · Primes {moneyMAD(slip.bonuses as number)} · Indemnités {moneyMAD(slip.indemnities as number)}</p>
                  {slip.linkNote ? <p className="mt-1 text-[var(--role-muted)]">{String(slip.linkNote)}</p> : null}
                  <p className="text-[var(--role-muted)]">Le virement reprend ce net.</p>
                  {text(slip.transferReference) ? <p>Réf. {text(slip.transferReference)} · {text(slip.transferDate)}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => downloadNamed(`/payslips/${idOf(slip)}/pdf`, `bulletin-${text(slip.period)}.pdf`).catch((e: Error) => toast.error(e.message))}>
                      <Download className="h-4 w-4" />
                      Bulletin PDF
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => downloadNamed(`/payslips/${idOf(slip)}/virement`, `virement-${text(slip.period)}.pdf`).catch((e: Error) => toast.error(e.message))}>
                      <Download className="h-4 w-4" />
                      Ordre de virement
                    </Button>
                    {canPay && text(slip.transferStatus) !== "PAID" ? (
                      <Button size="sm" onClick={() => markPaid(String(idOf(slip)))}>Marquer viré</Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Aucun bulletin" hint="Calculez un mois de paie pour générer le bulletin de cet employé." />
          )}
        </Card>
      ) : null}

      {tab === "documents" ? (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">{tr("Générer un document")}</h2>
            {canGenerate ? (
              <label className="inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-[var(--role-accent)]">
                <Paperclip className="h-4 w-4" />
                {uploading ? tr("Envoi…") : tr("Ajouter")}
                <input type="file" className="sr-only" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,application/pdf,image/*" disabled={uploading} onChange={(e) => onFile(e.target.files?.[0], "OTHER")} />
              </label>
            ) : null}
          </div>
          {canGenerate ? (
            <div className="flex flex-wrap gap-2">
              {GENERATED.map((item) => (
                <Button key={item.type} size="sm" variant="outline" disabled={generating === item.type} onClick={() => generate(item.type)}>
                  <FilePlus2 className="h-4 w-4" />
                  {generating === item.type ? "Envoi…" : item.label}
                </Button>
              ))}
            </div>
          ) : null}
          <DocumentList docs={otherDocs} empty="Aucun document" />
        </Card>
      ) : null}

      {tab === "leave" ? (
        <Card>
          <h2 className="mb-3 font-semibold">{tr("Congés")}</h2>
          {balances.data?.content.length ? (
            <ul className="space-y-2 text-sm">
              {balances.data.content.map((balance) => (
                <li key={idOf(balance)}>
                  {text(asRecord(balance.leaveType).name ?? balance.type) || "Solde"} {text(balance.year)} · restant {text(balance.remaining) || "0"} j
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Aucun solde" />
          )}
          <Link to={`/app/leave?employeeId=${id}`} className="mt-3 inline-block text-sm font-semibold text-[var(--role-accent)] hover:underline">
            {tr("Demandes")}
          </Link>
        </Card>
      ) : null}
    </div>
  );
}

function DocumentList({ docs, empty }: { docs: Record<string, unknown>[]; empty: string }) {
  const { tr } = useI18n();
  if (!docs.length) return <EmptyState title={empty} />;
  return (
    <ul className="space-y-2 text-sm">
      {docs.map((doc) => (
        <li key={idOf(doc)} className="flex items-center justify-between gap-2">
          <span>
            {text(doc.name ?? doc.originalName) || "Document"}
            <span className="ms-2 text-[var(--role-muted)]">{text(doc.category)}</span>
          </span>
          <button
            className="font-semibold text-[var(--role-accent)] hover:underline"
            onClick={() => downloadNamed(`/documents/${idOf(doc)}/file`, text(doc.originalName ?? doc.name) || "document").catch((e: Error) => toast.error(e.message))}
          >
            {tr("Télécharger")}
          </button>
        </li>
      ))}
    </ul>
  );
}
