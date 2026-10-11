import { ResourcePage, type ResourceConfig } from "@/components/ResourcePage";
export { EmployeeFilePage } from "./EmployeeFilePage";
import { hasPermission, normalizeRole } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch, listResource, updateResource } from "@/lib/api";
import { asRecord, fullName, idOf } from "@/lib/utils";
import { Button, Field, Input } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { SearchableSelect } from "@/components/SearchableSelect";

function useCan(code: string) {
  const { user } = useAuth();
  return hasPermission(user, code);
}

export const employeeConfig: ResourceConfig = {
  path: "/employees",
  queryKey: "employees",
  title: "Employés",
  subtitle: "Fiches salariés de la société",
  createLabel: "Nouvel employé",
  searchPlaceholder: "Nom, e-mail ou CIN",
  exports: [
    { label: "Excel", path: "/reports/headcount", filename: "effectif.xlsx" },
    { label: "PDF", path: "/reports/employees.pdf", filename: "effectif.pdf" },
  ],
  columns: [
    { key: "firstName|first_name", label: "Prénom" },
    { key: "lastName|last_name", label: "Nom" },
    { key: "email", label: "E-mail" },
    { key: "cin", label: "CIN" },
    { key: "city|ville", label: "Ville" },
    { key: "status", label: "Statut", status: true },
  ],
  fields: [
    { key: "firstName", label: "Prénom", required: true },
    { key: "lastName", label: "Nom", required: true },
    { key: "email", label: "E-mail", type: "email" },
    { key: "cin", label: "CIN" },
    { key: "phone", label: "Téléphone" },
    { key: "city", label: "Ville", filter: true },
    { key: "hireDate", label: "Date d’entrée", type: "date" },
    { key: "exitDate", label: "Date de sortie", type: "date" },
    { key: "cnssNumber", label: "N° CNSS" },
    { key: "rib", label: "RIB (24)" },
    { key: "departmentId", label: "Département", lookup: "departments", filter: true },
    { key: "positionId", label: "Poste", lookup: "positions" },
    { key: "managerId", label: "Manager", lookup: "employees" },
    { key: "establishmentId", label: "Établissement", lookup: "establishments" },
    { key: "bankName", label: "Banque" },
    { key: "bankBic", label: "BIC" },
    { key: "status", label: "Statut", filter: true, options: [
      { value: "ACTIVE", label: "Actif" },
      { value: "ON_LEAVE", label: "En congé" },
      { value: "SUSPENDED", label: "Suspendu" },
      { value: "RESIGNED", label: "Démission" },
      { value: "TERMINATED", label: "Licencié" },
      { value: "RETIRED", label: "Retraité" },
    ] },
    { key: "dependents", label: "Personnes à charge", type: "number" },
    { key: "birthDate", label: "Date de naissance", type: "date" },
    { key: "gender", label: "Genre", options: [
      { value: "F", label: "Femme" },
      { value: "M", label: "Homme" },
    ] },
    { key: "nationality", label: "Nationalité" },
    { key: "maritalStatus", label: "Situation familiale", options: [
      { value: "SINGLE", label: "Célibataire" },
      { value: "MARRIED", label: "Marié(e)" },
      { value: "DIVORCED", label: "Divorcé(e)" },
      { value: "WIDOWED", label: "Veuf / veuve" },
    ] },
    { key: "childrenCount", label: "Enfants à charge", type: "number" },
    { key: "address", label: "Adresse", type: "textarea" },
    { key: "personalEmail", label: "E-mail personnel", type: "email" },
    { key: "emergencyName", label: "Contact urgence" },
    { key: "emergencyRelation", label: "Lien" },
    { key: "emergencyPhone", label: "Tél. urgence" },
  ],
  onboard: true,
  afterCreate: "/app/employees/{id}",
  createSections: [
    {
      title: "Contrat",
      fields: [
        { key: "type", label: "Type", required: true, defaultValue: "CDI", options: [
          { value: "CDI", label: "CDI" },
          { value: "CDD", label: "CDD" },
          { value: "STAGE", label: "Stage" },
          { value: "INTERIM", label: "Intérim" },
        ] },
        { key: "startDate", label: "Début", type: "date", required: true, defaultValue: "today" },
        { key: "endDate", label: "Fin (CDD, stage, intérim)", type: "date" },
        { key: "baseSalary", label: "Salaire de base MAD", type: "number", required: true },
        { key: "weeklyHours", label: "Heures / semaine", type: "number", defaultValue: "44" },
        { key: "trialStart", label: "Début essai", type: "date" },
        { key: "trialEnd", label: "Fin essai", type: "date" },
        { key: "notes", label: "Notes", type: "textarea" },
      ],
    },
  ],
};

export function EmployeesPage() {
  return <ResourcePage config={employeeConfig} canWrite={useCan("EMPLOYEES_CREATE")} />;
}

export function DepartmentsPage() {
  return (
    <ResourcePage
      canWrite={useCan("DEPARTMENTS_MANAGE")}
      config={{
        path: "/departments",
        queryKey: "departments",
        title: "Départements",
        searchPlaceholder: "Nom ou description",
        columns: [
          { key: "name", label: "Nom" },
          { key: "description", label: "Description" },
          { key: "head|manager", label: "Responsable", name: true },
          { key: "headcount|employeeCount", label: "Effectif" },
        ],
        fields: [
          { key: "name", label: "Nom", required: true },
          { key: "description", label: "Description", type: "textarea" },
          { key: "managerId", label: "Responsable", lookup: "employees" },
        ],
      }}
    />
  );
}

export function PositionsPage() {
  return (
    <ResourcePage
      canWrite={useCan("POSITIONS_MANAGE")}
      config={{
        path: "/positions",
        queryKey: "positions",
        title: "Postes",
        searchPlaceholder: "Intitulé",
        columns: [
          { key: "title|name", label: "Intitulé" },
          { key: "department", label: "Département", name: true },
          { key: "minSalary", label: "Salaire min", money: true },
          { key: "maxSalary", label: "Salaire max", money: true },
        ],
        fields: [
          { key: "title", label: "Intitulé", required: true },
          { key: "departmentId", label: "Département", lookup: "departments" },
          { key: "description", label: "Description", type: "textarea" },
          { key: "missions", label: "Missions", type: "textarea" },
          { key: "skills", label: "Compétences", type: "textarea" },
          { key: "minSalary", label: "Salaire min MAD", type: "number" },
          { key: "maxSalary", label: "Salaire max MAD", type: "number" },
        ],
      }}
    />
  );
}

export function ContractsPage() {
  return (
    <ResourcePage
      canWrite={useCan("CONTRACTS_MANAGE")}
      config={{
        path: "/contracts",
        queryKey: "contracts",
        title: "Contrats",
        searchPlaceholder: "Type ou notes",
        attachment: "CONTRACT",
        download: (row) => `/contracts/${idOf(row)}/pdf`,
        exports: [
          { label: "Excel", path: "/reports/contracts", filename: "contrats.xlsx" },
          { label: "PDF", path: "/reports/contracts.pdf", filename: "contrats.pdf" },
        ],
        columns: [
          { key: "employee", label: "Employé", name: true },
          { key: "type", label: "Type", status: true },
          { key: "startDate", label: "Début" },
          { key: "endDate", label: "Fin" },
          { key: "baseSalary", label: "Salaire de base", money: true },
          { key: "status", label: "Statut", status: true },
        ],
        fields: [
          { key: "employeeId", label: "Employé", lookup: "employees", required: true, filter: true },
          { key: "type", label: "Type", required: true, filter: true, options: [
            { value: "CDI", label: "CDI" },
            { value: "CDD", label: "CDD" },
            { value: "STAGE", label: "Stage" },
            { value: "INTERIM", label: "Intérim" },
          ] },
          { key: "startDate", label: "Début", type: "date", required: true },
          { key: "endDate", label: "Fin", type: "date" },
          { key: "baseSalary", label: "Salaire de base MAD", type: "number", required: true },
          { key: "weeklyHours", label: "Heures / semaine", type: "number" },
          { key: "trialStart", label: "Début essai", type: "date" },
          { key: "trialEnd", label: "Fin essai", type: "date" },
          { key: "departmentId", label: "Département", lookup: "departments" },
          { key: "positionId", label: "Poste", lookup: "positions" },
          { key: "notes", label: "Notes", type: "textarea" },
          { key: "status", label: "Statut", filter: true, options: [
            { value: "ACTIVE", label: "Actif" },
            { value: "EXPIRING", label: "Expire bientôt" },
            { value: "EXPIRED", label: "Expiré" },
            { value: "ENDED", label: "Terminé" },
            { value: "TERMINATED", label: "Résilié" },
          ] },
        ],
      }}
    />
  );
}

export function AttendancePage({ absenceOnly = false, own = false }: { absenceOnly?: boolean; own?: boolean }) {
  const qc = useQueryClient();
  const clock = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {};
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 }),
          );
          payload.latitude = pos.coords.latitude;
          payload.longitude = pos.coords.longitude;
        } catch {
          /* GPS optionnel si aucun site n’est défini */
        }
      }
      return apiFetch<Record<string, unknown>>("/attendance/clock", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: (data) => {
      toast.success(String(data.action) === "DEPART" ? "Départ pointé" : "Arrivée pointée");
      qc.invalidateQueries({ queryKey: ["my-attendance"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div>
      {own ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-white p-4">
          <div>
            <p className="font-semibold">Pointer ma journée</p>
            <p className="text-sm text-indigo-700">Le premier appui enregistre l’arrivée, le second le départ. Le GPS est envoyé si l’établissement a une zone.</p>
          </div>
          <Button onClick={() => clock.mutate()} disabled={clock.isPending}>Pointer</Button>
        </div>
      ) : null}
      <ResourcePage
      canWrite={useCan("ATTENDANCE_MANAGE") && !own}
      config={{
        path: "/attendance",
        queryKey: absenceOnly ? "absences" : own ? "my-attendance" : "attendance",
        title: own ? "Mes présences" : absenceOnly ? "Absences" : "Présences",
        searchPlaceholder: "Motif",
        defaultFilters: absenceOnly ? { status: "ABSENT" } : undefined,
        exports: own || absenceOnly ? undefined : [
          { label: "Excel", path: "/reports/attendance", filename: "presences.xlsx" },
          { label: "PDF", path: "/reports/attendance.pdf", filename: "presences.pdf" },
        ],
        columns: [
          ...(own ? [] : [{ key: "employee", label: "Employé", name: true as const }]),
          { key: "date", label: "Date" },
          { key: "checkIn|arrival", label: "Arrivée" },
          { key: "checkOut|departure", label: "Départ" },
          { key: "status", label: "Statut", status: true },
        ],
        fields: [
          { key: "employeeId", label: "Employé", lookup: "employees", required: true, filter: !own },
          { key: "date", label: "Date", type: "date", required: true, filter: true },
          { key: "checkIn", label: "Arrivée" },
          { key: "checkOut", label: "Départ" },
          { key: "status", label: "Statut", required: true, filter: true, options: [
            { value: "PRESENT", label: "Présent" },
            { value: "ABSENT", label: "Absent" },
            { value: "LATE", label: "Retard" },
            { value: "EARLY_LEAVE", label: "Départ anticipé" },
            { value: "REMOTE", label: "Télétravail" },
            { value: "MISSION", label: "Mission" },
            { value: "EXCUSED", label: "Excusé" },
            { value: "ON_LEAVE", label: "En congé" },
          ] },
          { key: "comment", label: "Motif", type: "textarea" },
          { key: "method", label: "Méthode" },
        ],
      }}
    />
    </div>
  );
}

export function WorkingHoursPage() {
  return (
    <ResourcePage
      canWrite={useCan("SETTINGS_MANAGE")}
      config={{
        path: "/working-hours",
        queryKey: "working-hours",
        title: "Horaires",
        searchPlaceholder: "Nom ou jours",
        subtitle: "Plafond légal rappelé : 44 h / semaine (non agricole).",
        columns: [
          { key: "name|scope", label: "Périmètre" },
          { key: "startTime", label: "Début" },
          { key: "endTime", label: "Fin" },
          { key: "breakStart", label: "Pause début" },
          { key: "breakEnd", label: "Pause fin" },
          { key: "weeklyHours", label: "H / sem." },
        ],
        fields: [
          { key: "name", label: "Nom", required: true },
          { key: "departmentId", label: "Département", lookup: "departments" },
          { key: "employeeId", label: "Employé", lookup: "employees" },
          { key: "startTime", label: "Heure début" },
          { key: "endTime", label: "Heure fin" },
          { key: "breakStart", label: "Pause début" },
          { key: "breakEnd", label: "Pause fin" },
          { key: "weeklyHours", label: "Heures hebdo", type: "number" },
          { key: "workDays", label: "Jours (ex. MON-FRI)" },
        ],
      }}
    />
  );
}

export function LeaveTypesPage() {
  return (
    <ResourcePage
      canWrite={useCan("SETTINGS_MANAGE")}
      config={{
        path: "/leave-types",
        queryKey: "leave-types",
        title: "Types de congés",
        searchPlaceholder: "Nom ou code",
        columns: [
          { key: "name", label: "Nom" },
          { key: "code", label: "Code" },
          { key: "paid", label: "Payé" },
          { key: "deductsAnnual", label: "Déduit l’annuel" },
        ],
        fields: [
          { key: "name", label: "Nom", required: true },
          { key: "code", label: "Code" },
          { key: "paid", label: "Payé (true/false)" },
          { key: "deductsAnnual", label: "Déduit l’annuel (true/false)" },
        ],
      }}
    />
  );
}

export function LeaveBalancesPage() {
  return (
    <ResourcePage
      canWrite={useCan("SETTINGS_MANAGE")}
      config={{
        path: "/leave-balances",
        queryKey: "leave-balances",
        title: "Soldes de congés",
        searchPlaceholder: "Employé",
        subtitle: "Jours ouvrables. Acquisition 1,5 j / mois, plafond 30.",
        columns: [
          { key: "employee", label: "Employé", name: true },
          { key: "leaveType|type", label: "Type" },
          { key: "accrued", label: "Acquis" },
          { key: "used", label: "Pris" },
          { key: "remaining", label: "Restant" },
        ],
        fields: [
          { key: "employeeId", label: "Employé", lookup: "employees", required: true, filter: true },
          { key: "leaveTypeId", label: "Type", lookup: "leave-types", required: true, filter: true },
          { key: "accrued", label: "Acquis", type: "number" },
          { key: "used", label: "Pris", type: "number" },
          { key: "remaining", label: "Restant", type: "number" },
        ],
      }}
    />
  );
}

export function DocumentsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const employee = normalizeRole(user?.role) === "EMPLOYEE";
  const canSign = useCan("DOCUMENTS_UPLOAD");
  const sign = useMutation({
    mutationFn: (id: string) => apiFetch(`/documents/${id}/sign`, { method: "POST", body: "{}" }),
    onSuccess: () => {
      toast.success(employee ? "Réception enregistrée" : "Document signé");
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <ResourcePage
      canWrite={useCan("DOCUMENTS_UPLOAD")}
      config={{
        path: "/documents",
        queryKey: "documents",
        title: "Documents",
        searchPlaceholder: "Nom du document",
        attachment: "DOCUMENT",
        extraActions: (row) => {
          const category = String(row.category ?? "").toUpperCase();
          const own = user?.employeeId != null && String(row.employeeId ?? asRecord(row.employee).id ?? "") === String(user.employeeId);
          if (employee) {
            if (!own || (category !== "CONTRACT" && category !== "ADMIN")) return null;
            return (
              <Button size="sm" variant="outline" onClick={() => sign.mutate(idOf(row))}>
                Accuser réception
              </Button>
            );
          }
          if (!canSign) return null;
          if (category === "CIN" || category === "MEDICAL" || category === "DIPLOMA" || category === "PAYSLIP") return null;
          return (
            <Button size="sm" variant="outline" onClick={() => sign.mutate(idOf(row))}>
              Signer
            </Button>
          );
        },
        exports: [
          { label: "Excel", path: "/reports/documents", filename: "documents.xlsx" },
          { label: "PDF", path: "/reports/documents.pdf", filename: "documents.pdf" },
        ],
        columns: [
          { key: "name|originalName|title", label: "Nom" },
          { key: "category", label: "Catégorie" },
          { key: "employee", label: "Employé", name: true },
          { key: "createdAt", label: "Date" },
        ],
        fields: [
          { key: "name", label: "Nom", required: true },
          { key: "employeeId", label: "Employé", lookup: "employees", filter: true },
          { key: "category", label: "Catégorie", filter: true, options: [
            { value: "CONTRACT", label: "Contrat" },
            { value: "CIN", label: "CIN" },
            { value: "DIPLOMA", label: "Diplôme" },
            { value: "CERTIFICATE", label: "Certificat" },
            { value: "ATTESTATION", label: "Attestation" },
            { value: "PAYSLIP", label: "Bulletin" },
            { value: "MEDICAL", label: "Médical" },
            { value: "ADMIN", label: "Administratif" },
            { value: "OTHER", label: "Autre" },
          ] },
          { key: "visibleToEmployee", label: "Visible salarié (true/false)" },
          { key: "privateDoc", label: "Confidentiel CIN/médical (true/false)" },
        ],
      }}
    />
  );
}

export function RequestsPage() {
  const { user } = useAuth();
  const canProcess = useCan("REQUESTS_PROCESS");
  const admin = normalizeRole(user?.role) === "ADMIN";
  const qc = useQueryClient();
  const process = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "complete" | "reject" }) =>
      apiFetch(`/employee-requests/${id}/process`, { method: "POST", body: JSON.stringify({ action }) }),
    onSuccess: () => {
      toast.success("Demande traitée");
      qc.invalidateQueries({ queryKey: ["employee-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <ResourcePage
      canWrite={useCan("REQUESTS_CREATE")}
      config={{
        path: "/employee-requests",
        queryKey: "employee-requests",
        title: "Demandes RH",
        searchPlaceholder: "Type ou commentaire",
        exports: [
          { label: "Excel", path: "/reports/requests", filename: "demandes.xlsx" },
          { label: "PDF", path: "/reports/requests.pdf", filename: "demandes.pdf" },
        ],
        download: (row) => {
          const status = String(row.status ?? "");
          const type = String(row.type ?? "").toUpperCase();
          const salary = type.includes("SALARY") || type.includes("SALAIRE");
          const ownerId = String(row.employeeId ?? asRecord(row.employee).id ?? "");
          const own = user?.employeeId != null && ownerId === String(user.employeeId);
          if (salary && !own && !canProcess) return null;
          if (status === "COMPLETED" || status === "APPROVED" || row.documentId) {
            return `/employee-requests/${idOf(row)}/pdf`;
          }
          return null;
        },
        extraActions: (row) => {
          const status = String(row.status);
          if (!canProcess) return null;
          if (admin && (status === "PENDING" || status === "MANAGER_APPROVED")) {
            return (
              <div className="flex gap-1">
                <Button size="sm" onClick={() => process.mutate({ id: idOf(row), action: "complete" })}>
                  Émettre
                </Button>
                <Button size="sm" variant="danger" onClick={() => process.mutate({ id: idOf(row), action: "reject" })}>
                  Refuser
                </Button>
              </div>
            );
          }
          if (!admin && status === "PENDING") {
            return (
              <div className="flex gap-1">
                <Button size="sm" onClick={() => process.mutate({ id: idOf(row), action: "complete" })}>
                  Valider
                </Button>
                <Button size="sm" variant="danger" onClick={() => process.mutate({ id: idOf(row), action: "reject" })}>
                  Refuser
                </Button>
              </div>
            );
          }
          return null;
        },
        columns: [
          { key: "employee", label: "Employé", name: true },
          { key: "type", label: "Type" },
          { key: "status", label: "Statut", status: true },
          { key: "createdAt", label: "Date" },
        ],
        fields: [
          { key: "employeeId", label: "Employé", lookup: "employees", filter: true },
          { key: "type", label: "Type", required: true, filter: true, options: [
            { value: "WORK_CERTIFICATE", label: "Attestation de travail" },
            { value: "SALARY_CERTIFICATE", label: "Attestation de salaire" },
            { value: "EMPLOYMENT_CERTIFICATE", label: "Attestation d’emploi" },
            { value: "LEAVE_CERTIFICATE", label: "Attestation de congé" },
            { value: "OTHER", label: "Autre" },
          ] },
          { key: "notes", label: "Commentaire", type: "textarea" },
          { key: "status", label: "Statut", filter: true, options: [
            { value: "PENDING", label: "En attente" },
            { value: "PROCESSING", label: "En cours" },
            { value: "APPROVED", label: "Approuvée" },
            { value: "REJECTED", label: "Refusée" },
            { value: "COMPLETED", label: "Terminée" },
          ] },
        ],
      }}
    />
  );
}

export function AnnouncementsPage() {
  return (
    <ResourcePage
      canWrite={useCan("ANNOUNCEMENTS_MANAGE")}
      config={{
        path: "/announcements",
        queryKey: "announcements",
        title: "Annonces",
        searchPlaceholder: "Titre ou message",
        columns: [
          { key: "title", label: "Titre" },
          { key: "target|audience", label: "Cible" },
          { key: "createdAt|date", label: "Date" },
        ],
        fields: [
          { key: "title", label: "Titre", required: true },
          { key: "body", label: "Message", type: "textarea", required: true },
          { key: "target", label: "Cible", options: [
            { value: "COMPANY", label: "Société" },
            { value: "DEPARTMENT", label: "Département" },
          ] },
          { key: "departmentId", label: "Département", lookup: "departments" },
        ],
      }}
    />
  );
}

export function NotificationsPage() {
  const qc = useQueryClient();
  const markAll = useMutation({
    mutationFn: () => apiFetch("/notifications/read-all", { method: "POST", body: "{}" }),
    onSuccess: () => {
      toast.success("Tout marqué comme lu");
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const markOne = useMutation({
    mutationFn: (id: string) => apiFetch(`/notifications/${id}/read`, { method: "POST", body: "{}" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <ResourcePage
      canWrite={false}
      config={{
        path: "/notifications",
        queryKey: "notifications",
        title: "Notifications",
        searchPlaceholder: "Message",
        readOnly: true,
        headerActions: (
          <Button size="sm" variant="outline" onClick={() => markAll.mutate()}>
            Tout lire
          </Button>
        ),
        extraActions: (row) =>
          row.read === true || row.read === "true" ? null : (
            <Button size="sm" variant="ghost" onClick={() => markOne.mutate(idOf(row))}>
              Marquer lu
            </Button>
          ),
        columns: [
          { key: "title|message", label: "Message" },
          { key: "read", label: "Lu" },
          { key: "createdAt", label: "Date" },
        ],
        fields: [],
      }}
    />
  );
}

export function ExpensesPage() {
  const { user } = useAuth();
  const canApprove = useCan("EXPENSES_APPROVE");
  const admin = normalizeRole(user?.role) === "ADMIN";
  const qc = useQueryClient();
  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateResource("/expenses", id, { status }),
    onSuccess: () => {
      toast.success("Note de frais mise à jour");
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <ResourcePage
      canWrite={useCan("EXPENSES_VIEW")}
      config={{
        path: "/expenses",
        queryKey: "expenses",
        title: "Notes de frais",
        subtitle: "Transport, repas, hébergement. Le manager approuve, puis la RH peut marquer le remboursement.",
        searchPlaceholder: "Catégorie ou notes",
        attachment: "RECEIPT",
        exports: [
          { label: "Excel", path: "/reports/expenses", filename: "notes-de-frais.xlsx" },
          { label: "PDF", path: "/reports/expenses.pdf", filename: "notes-de-frais.pdf" },
        ],
        extraActions: (row) => {
          const own = user?.employeeId != null && String(row.employeeId ?? "") === String(user.employeeId);
          if (!canApprove || own) return null;
          if (String(row.status) === "PENDING") {
            return (
              <div className="flex gap-1">
                <Button size="sm" onClick={() => decide.mutate({ id: idOf(row), status: "APPROVED" })}>
                  Approuver
                </Button>
                <Button size="sm" variant="danger" onClick={() => decide.mutate({ id: idOf(row), status: "REJECTED" })}>
                  Refuser
                </Button>
              </div>
            );
          }
          if (admin && String(row.status) === "APPROVED") {
            return (
              <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: idOf(row), status: "REIMBURSED" })}>
                Rembourser
              </Button>
            );
          }
          return null;
        },
        columns: [
          { key: "employee", label: "Employé", name: true },
          { key: "category", label: "Catégorie" },
          { key: "amount", label: "Montant", money: true },
          { key: "date", label: "Date" },
          { key: "status", label: "Statut", status: true },
        ],
        fields: [
          { key: "employeeId", label: "Employé", lookup: "employees", required: true, filter: true },
          { key: "category", label: "Catégorie", required: true, filter: true, options: [
            { value: "TRANSPORT", label: "Transport" },
            { value: "MEAL", label: "Repas" },
            { value: "LODGING", label: "Hébergement" },
            { value: "SUPPLIES", label: "Fournitures" },
            { value: "OTHER", label: "Autre" },
          ] },
          { key: "amount", label: "Montant MAD", type: "number", required: true },
          { key: "date", label: "Date", type: "date", required: true },
          { key: "notes", label: "Notes", type: "textarea" },
          { key: "status", label: "Statut", filter: true, options: [
            { value: "PENDING", label: "En attente" },
            { value: "APPROVED", label: "Approuvée" },
            { value: "REJECTED", label: "Refusée" },
            ...(admin ? [{ value: "REIMBURSED", label: "Remboursée" }] : []),
          ] },
        ],
      }}
    />
  );
}

export function TripsPage() {
  const { user } = useAuth();
  const canApprove = useCan("EXPENSES_APPROVE");
  const qc = useQueryClient();
  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateResource("/business-trips", id, { status }),
    onSuccess: () => {
      toast.success("Déplacement mis à jour");
      qc.invalidateQueries({ queryKey: ["trips"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <ResourcePage
      canWrite={useCan("EXPENSES_VIEW")}
      config={{
        path: "/business-trips",
        queryKey: "trips",
        title: "Déplacements",
        subtitle: "Mission à faire valider avant le départ.",
        searchPlaceholder: "Destination",
        exports: [
          { label: "Excel", path: "/reports/trips", filename: "deplacements.xlsx" },
          { label: "PDF", path: "/reports/trips.pdf", filename: "deplacements.pdf" },
        ],
        extraActions: (row) => {
          const own = user?.employeeId != null && String(row.employeeId ?? "") === String(user.employeeId);
          return canApprove && !own && String(row.status) === "PENDING" ? (
            <div className="flex gap-1">
              <Button size="sm" onClick={() => decide.mutate({ id: idOf(row), status: "APPROVED" })}>
                Approuver
              </Button>
              <Button size="sm" variant="danger" onClick={() => decide.mutate({ id: idOf(row), status: "REJECTED" })}>
                Refuser
              </Button>
            </div>
          ) : null;
        },
        columns: [
          { key: "employee", label: "Employé", name: true },
          { key: "destination", label: "Destination" },
          { key: "startDate", label: "Début" },
          { key: "endDate", label: "Fin" },
          { key: "status", label: "Statut", status: true },
        ],
        fields: [
          { key: "employeeId", label: "Employé", lookup: "employees", required: true, filter: true },
          { key: "destination", label: "Destination", required: true },
          { key: "startDate", label: "Début", type: "date", required: true },
          { key: "endDate", label: "Fin", type: "date", required: true },
          { key: "purpose", label: "Motif", type: "textarea" },
          { key: "status", label: "Statut", filter: true, options: [
            { value: "PENDING", label: "En attente" },
            { value: "APPROVED", label: "Approuvé" },
            { value: "REJECTED", label: "Refusé" },
          ] },
        ],
      }}
    />
  );
}

function ProgressAction({ id, value }: { id: string; value: string }) {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(value);
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: () => updateResource("/objectives", id, { progress: Number(progress) }),
    onSuccess: () => {
      toast.success("Avancement enregistré");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["objectives"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => { setProgress(value); setOpen(true); }}>
        Avancement
      </Button>
      <Modal
        open={open}
        title="Avancement"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button disabled={save.isPending} onClick={() => save.mutate()}>Enregistrer</Button>
          </>
        }
      >
        <Field label="Pourcentage (0 à 100)">
          <Input type="number" min={0} max={100} value={progress} onChange={(e) => setProgress(e.target.value)} />
        </Field>
      </Modal>
    </>
  );
}

export function ReviewsPage() {
  const { user } = useAuth();
  const canManage = useCan("PERFORMANCE_MANAGE");
  const qc = useQueryClient();
  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateResource("/performance-reviews", id, { status }),
    onSuccess: () => {
      toast.success("Entretien mis à jour");
      qc.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <ResourcePage
      canWrite={canManage}
      config={{
        path: "/performance-reviews",
        queryKey: "reviews",
        title: "Entretiens",
        subtitle: "Brouillon, puis partage au salarié. Il accuse réception. La note est sur 5. Un manager n’évalue pas son propre dossier.",
        searchPlaceholder: "Période",
        exports: [
          { label: "Excel", path: "/reports/reviews", filename: "entretiens.xlsx" },
          { label: "PDF", path: "/reports/reviews.pdf", filename: "entretiens.pdf" },
        ],
        extraActions: (row) => {
          const mine = user?.employeeId != null && String(row.employeeId ?? "") === String(user.employeeId);
          const status = String(row.status ?? "");
          if (canManage && !mine && status === "DRAFT") {
            return <Button size="sm" onClick={() => decide.mutate({ id: idOf(row), status: "SHARED" })}>Partager</Button>;
          }
          if (mine && status === "SHARED") {
            return <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: idOf(row), status: "ACKNOWLEDGED" })}>Accuser réception</Button>;
          }
          return null;
        },
        columns: [
          { key: "employee", label: "Employé", name: true },
          { key: "period", label: "Période" },
          { key: "rating", label: "Note" },
          { key: "status", label: "Statut", status: true },
        ],
        fields: [
          { key: "employeeId", label: "Employé", lookup: "employees", required: true, filter: true },
          { key: "period", label: "Période", required: true },
          { key: "rating", label: "Note sur 5", type: "number", required: true },
          { key: "comments", label: "Commentaires", type: "textarea" },
          { key: "status", label: "Statut", filter: true, options: [
            { value: "DRAFT", label: "Brouillon" },
            { value: "SHARED", label: "Partagé" },
            { value: "ACKNOWLEDGED", label: "Accusé" },
          ] },
        ],
      }}
    />
  );
}

export function ObjectivesPage() {
  const { user } = useAuth();
  const employee = normalizeRole(user?.role) === "EMPLOYEE";
  return (
    <ResourcePage
      canWrite={useCan("PERFORMANCE_MANAGE")}
      config={{
        path: "/objectives",
        queryKey: "objectives",
        title: "Objectifs",
        subtitle: "Le manager fixe l’objectif. Le salarié met à jour l’avancement, de 0 à 100.",
        searchPlaceholder: "Titre",
        exports: [
          { label: "Excel", path: "/reports/objectives", filename: "objectifs.xlsx" },
          { label: "PDF", path: "/reports/objectives.pdf", filename: "objectifs.pdf" },
        ],
        extraActions: (row) => {
          const mine = user?.employeeId != null && String(row.employeeId ?? "") === String(user.employeeId);
          if (!employee || !mine) return null;
          return <ProgressAction id={idOf(row)} value={String(row.progress ?? 0)} />;
        },
        columns: [
          { key: "employee", label: "Employé", name: true },
          { key: "title", label: "Objectif" },
          { key: "dueDate", label: "Échéance" },
          { key: "progress", label: "Avancement" },
        ],
        fields: [
          { key: "employeeId", label: "Employé", lookup: "employees", required: true, filter: true },
          { key: "title", label: "Titre", required: true },
          { key: "dueDate", label: "Échéance", type: "date" },
          { key: "progress", label: "Avancement %", type: "number" },
        ],
      }}
    />
  );
}

export function JobsPage() {
  const qc = useQueryClient();
  const close = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateResource("/job-offers", id, { status }),
    onSuccess: () => {
      toast.success("Offre mise à jour");
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <ResourcePage
      canWrite={useCan("RECRUITMENT_MANAGE")}
      config={{
        path: "/job-offers",
        queryKey: "jobs",
        title: "Offres d’emploi",
        subtitle: "Une offre fermée n’accepte plus de candidat. Les salariés ne voient pas ce module.",
        searchPlaceholder: "Poste ou ville",
        exports: [
          { label: "Excel", path: "/reports/jobs", filename: "offres.xlsx" },
          { label: "PDF", path: "/reports/jobs.pdf", filename: "offres.pdf" },
        ],
        extraActions: (row) => {
          const status = String(row.status ?? "");
          if (status === "OPEN") {
            return <Button size="sm" variant="outline" onClick={() => close.mutate({ id: idOf(row), status: "CLOSED" })}>Fermer</Button>;
          }
          if (status === "CLOSED") {
            return <Button size="sm" onClick={() => close.mutate({ id: idOf(row), status: "OPEN" })}>Rouvrir</Button>;
          }
          return null;
        },
        columns: [
          { key: "title", label: "Poste" },
          { key: "department", label: "Département", name: true },
          { key: "city", label: "Ville" },
          { key: "status", label: "Statut", status: true },
        ],
        fields: [
          { key: "title", label: "Titre", required: true },
          { key: "departmentId", label: "Département", lookup: "departments" },
          { key: "city", label: "Ville" },
          { key: "description", label: "Description", type: "textarea" },
          { key: "published", label: "Site carrières (true/false)" },
          { key: "status", label: "Statut", filter: true, options: [
            { value: "OPEN", label: "Ouverte" },
            { value: "CLOSED", label: "Fermée" },
          ] },
        ],
      }}
    />
  );
}

export function CandidatesPage() {
  const qc = useQueryClient();
  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateResource("/candidates", id, { status }),
    onSuccess: () => {
      toast.success("Candidat mis à jour");
      qc.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <ResourcePage
      canWrite={useCan("RECRUITMENT_MANAGE")}
      config={{
        path: "/candidates",
        queryKey: "candidates",
        title: "Candidats",
        subtitle: "Nouveau, entretien, puis recruté ou refusé. Recruter ne crée pas le dossier salarié.",
        searchPlaceholder: "Nom ou e-mail",
        exports: [
          { label: "Excel", path: "/reports/candidates", filename: "candidats.xlsx" },
          { label: "PDF", path: "/reports/candidates.pdf", filename: "candidats.pdf" },
        ],
        extraActions: (row) => {
          const status = String(row.status ?? "");
          if (status === "NEW") {
            return (
              <div className="flex gap-1">
                <Button size="sm" onClick={() => move.mutate({ id: idOf(row), status: "INTERVIEW" })}>Convoquer</Button>
                <Button size="sm" variant="danger" onClick={() => move.mutate({ id: idOf(row), status: "REJECTED" })}>Refuser</Button>
              </div>
            );
          }
          if (status === "INTERVIEW") {
            return (
              <div className="flex gap-1">
                <Button size="sm" onClick={() => move.mutate({ id: idOf(row), status: "HIRED" })}>Recruter</Button>
                <Button size="sm" variant="danger" onClick={() => move.mutate({ id: idOf(row), status: "REJECTED" })}>Refuser</Button>
              </div>
            );
          }
          return null;
        },
        columns: [
          { key: "firstName", label: "Prénom" },
          { key: "lastName", label: "Nom" },
          { key: "email", label: "E-mail" },
          { key: "jobOffer|offer", label: "Offre" },
          { key: "status", label: "Statut", status: true },
        ],
        fields: [
          { key: "firstName", label: "Prénom", required: true },
          { key: "lastName", label: "Nom", required: true },
          { key: "email", label: "E-mail", type: "email" },
          { key: "jobOfferId", label: "Offre", lookup: "job-offers", filter: true },
          { key: "status", label: "Statut", filter: true, options: [
            { value: "NEW", label: "Nouveau" },
            { value: "INTERVIEW", label: "Entretien" },
            { value: "HIRED", label: "Recruté" },
            { value: "REJECTED", label: "Refusé" },
          ] },
        ],
      }}
    />
  );
}

function ChecklistPage({ kind }: { kind: "onboarding" | "offboarding" }) {
  const { user } = useAuth();
  const canEdit = useCan("EMPLOYEES_EDIT");
  const onboarding = kind === "onboarding";
  const path = onboarding ? "/onboarding" : "/offboarding";
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const people = useQuery({
    queryKey: ["employees", "checklist"],
    enabled: open,
    queryFn: () => listResource<Record<string, unknown>>("/employees", { page: 0, size: 200 }),
  });
  const launch = useMutation({
    mutationFn: () => apiFetch(`${path}/launch`, { method: "POST", body: JSON.stringify({ employeeId: Number(employeeId) }) }),
    onSuccess: () => {
      toast.success(onboarding ? "Parcours d’intégration ouvert" : "Parcours de départ ouvert");
      setOpen(false);
      setEmployeeId("");
      qc.invalidateQueries({ queryKey: [kind] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const done = useMutation({
    mutationFn: (id: string) => updateResource(path, id, { status: "DONE" }),
    onSuccess: () => {
      toast.success("Tâche marquée faite");
      qc.invalidateQueries({ queryKey: [kind] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const options = (people.data?.content ?? []).map((row) => ({ value: idOf(row), label: fullName(row) }));
  return (
    <>
      <ResourcePage
        canWrite={canEdit}
        config={{
          path,
          queryKey: kind,
          title: onboarding ? "Intégration" : "Départ",
          subtitle: onboarding
            ? "Checklist d’arrivée. Le salarié marque ses tâches faites. Le statut du dossier ne change pas tout seul."
            : "Checklist de départ. Le salarié n’est pas supprimé : la RH met à jour son statut quand le parcours est fini.",
          searchPlaceholder: "Tâche",
          headerActions: canEdit ? (
            <Button variant="outline" onClick={() => setOpen(true)}>Ouvrir le parcours</Button>
          ) : null,
          exports: [
            { label: "Excel", path: `/reports/${kind}`, filename: onboarding ? "integration.xlsx" : "depart.xlsx" },
            { label: "PDF", path: `/reports/${kind}.pdf`, filename: onboarding ? "integration.pdf" : "depart.pdf" },
          ],
          extraActions: (row) => {
            if (String(row.status) !== "PENDING") return null;
            const mine = user?.employeeId != null && String(row.employeeId ?? "") === String(user.employeeId);
            if (!mine && !canEdit) return null;
            return (
              <Button size="sm" onClick={() => done.mutate(idOf(row))}>
                Marquer fait
              </Button>
            );
          },
          columns: [
            { key: "employee", label: "Employé", name: true },
            { key: "task|title", label: "Tâche" },
            { key: "dueDate", label: "Échéance" },
            { key: "status", label: "Statut", status: true },
          ],
          fields: [
            { key: "employeeId", label: "Employé", lookup: "employees", required: true, filter: true },
            { key: "task", label: "Tâche", required: true },
            { key: "dueDate", label: "Échéance", type: "date" },
            { key: "status", label: "Statut", filter: true, options: [
              { value: "PENDING", label: "À faire" },
              { value: "DONE", label: "Fait" },
            ] },
          ],
        }}
      />
      <Modal
        open={open}
        title={onboarding ? "Ouvrir l’intégration" : "Ouvrir le départ"}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button disabled={!employeeId || launch.isPending} onClick={() => launch.mutate()}>Ouvrir</Button>
          </>
        }
      >
        <Field label="Employé">
          <SearchableSelect
            value={employeeId}
            onChange={setEmployeeId}
            options={options}
            placeholder="Choisir un employé"
            searchPlaceholder="Nom"
          />
        </Field>
      </Modal>
    </>
  );
}

export function OnboardingPage() {
  return <ChecklistPage kind="onboarding" />;
}

export function OffboardingPage() {
  return <ChecklistPage kind="offboarding" />;
}

const V1_PERMISSIONS = [
  "EMPLOYEES_VIEW", "EMPLOYEES_CREATE", "EMPLOYEES_EDIT",
  "DEPARTMENTS_MANAGE", "POSITIONS_MANAGE",
  "CONTRACTS_VIEW", "CONTRACTS_MANAGE",
  "ATTENDANCE_VIEW", "ATTENDANCE_MANAGE",
  "LEAVE_VIEW", "LEAVE_REQUEST", "LEAVE_APPROVE",
  "DOCUMENTS_VIEW", "DOCUMENTS_UPLOAD", "DOCUMENTS_PRIVATE",
  "REQUESTS_CREATE", "REQUESTS_PROCESS",
  "ANNOUNCEMENTS_VIEW", "ANNOUNCEMENTS_MANAGE",
  "USERS_MANAGE", "SETTINGS_MANAGE", "AUDIT_VIEW",
  "ASSISTANT_USE", "STATS_VIEW",
  "PAYROLL_VIEW", "PAYROLL_EDIT", "PAYSLIPS_VIEW_OWN",
  "EXPENSES_VIEW", "EXPENSES_APPROVE", "RECRUITMENT_MANAGE", "PERFORMANCE_MANAGE",
];

export function UsersPage() {
  const [target, setTarget] = useState<Record<string, unknown> | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const qc = useQueryClient();
  const perms = useQuery({
    queryKey: ["user-permissions", target ? idOf(target) : ""],
    enabled: Boolean(target),
    queryFn: () => apiFetch<string[]>(`/users/${idOf(target!)}/permissions`),
  });

  useEffect(() => {
    if (Array.isArray(perms.data)) setSelected(perms.data);
  }, [perms.data]);

  const savePerms = useMutation({
    mutationFn: () =>
      apiFetch(`/users/${idOf(target!)}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ permissions: selected }),
      }),
    onSuccess: () => {
      toast.success("Droits enregistrés");
      setTarget(null);
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <ResourcePage
        canWrite={useCan("USERS_MANAGE")}
        config={{
          path: "/users",
          queryKey: "users",
          title: "Utilisateurs",
          searchPlaceholder: "Nom ou e-mail",
          extraActions: (row) => (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setTarget(row);
                setSelected([]);
              }}
            >
              Droits
            </Button>
          ),
          columns: [
            { key: "firstName", label: "Prénom" },
            { key: "lastName", label: "Nom" },
            { key: "email", label: "E-mail" },
            { key: "role", label: "Rôle", status: true },
            { key: "active", label: "Actif" },
          ],
          fields: [
            { key: "firstName", label: "Prénom", required: true },
            { key: "lastName", label: "Nom", required: true },
            { key: "email", label: "E-mail", type: "email", required: true },
            { key: "password", label: "Mot de passe (vide = invitation)" },
            { key: "role", label: "Rôle", required: true, options: [
              { value: "ADMIN", label: "Admin" },
              { value: "MANAGER", label: "Manager" },
              { value: "EMPLOYEE", label: "Employé" },
            ] },
            { key: "employeeId", label: "Fiche employé", lookup: "employees" },
            { key: "locale", label: "Locale", options: [
              { value: "fr", label: "Français" },
              { value: "ar", label: "Arabe" },
            ] },
          ],
        }}
      />
      <Modal
        open={Boolean(target)}
        title={`Droits — ${String(asRecord(target).email ?? "")}`}
        onClose={() => setTarget(null)}
        footer={<Button onClick={() => savePerms.mutate()} disabled={savePerms.isPending}>Enregistrer</Button>}
      >
        <div className="grid max-h-80 gap-1 overflow-y-auto text-sm">
          {V1_PERMISSIONS.map((code) => {
            const on = selected.includes(code);
            return (
              <label key={code} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => setSelected(on ? selected.filter((c) => c !== code) : [...selected, code])}
                />
                {code}
              </label>
            );
          })}
        </div>
      </Modal>
    </>
  );
}

export function AuditPage() {
  return (
    <ResourcePage
      canWrite={false}
      config={{
        path: "/audit-logs",
        queryKey: "audit",
        title: "Journal d’audit",
        searchPlaceholder: "Action, entité ou e-mail",
        readOnly: true,
        columns: [
          { key: "createdAt", label: "Date" },
          { key: "action", label: "Action" },
          { key: "entityType", label: "Entité" },
          { key: "entityId", label: "Id" },
          { key: "userEmail|user", label: "Utilisateur" },
        ],
        fields: [],
      }}
    />
  );
}

export function HolidaysPage() {
  return (
    <ResourcePage
      canWrite={useCan("SETTINGS_MANAGE")}
      config={{
        path: "/holidays",
        queryKey: "holidays",
        title: "Jours fériés",
        searchPlaceholder: "Nom",
        columns: [
          { key: "date", label: "Date" },
          { key: "name", label: "Nom" },
          { key: "type", label: "Type" },
        ],
        fields: [
          { key: "date", label: "Date", type: "date", required: true },
          { key: "name", label: "Nom", required: true },
          { key: "type", label: "Type", options: [
            { value: "NATIONAL", label: "National" },
            { value: "RELIGIOUS", label: "Religieux" },
            { value: "COMPANY", label: "Entreprise" },
          ] },
        ],
      }}
    />
  );
}

export { PayslipsPage } from "./PayrollPages";
