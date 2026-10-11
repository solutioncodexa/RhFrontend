import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import { apiFetch, createResource, downloadNamed, listResource } from "@/lib/api";
import { Download } from "lucide-react";
import { asRecord, formatDate, fullName, idOf, scrollContentTop } from "@/lib/utils";
import { actionLock, Badge, Button, ErrorState, Field, Input, PageHeader, Spinner, Textarea, statusTone } from "@/components/ui";
import { SearchableSelect } from "@/components/SearchableSelect";
import { Modal } from "@/components/Modal";
import { ColumnFilter } from "@/components/ColumnFilter";
import { hasPermission, normalizeRole } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useSearchParams } from "react-router-dom";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";
import { fr } from "date-fns/locale";

export function LeaveRequestsPage() {
  const { tr } = useI18n();
  const { user } = useAuth();
  const canApprove = hasPermission(user, "LEAVE_APPROVE");
  const admin = normalizeRole(user?.role) === "ADMIN";
  const canRequest = hasPermission(user, "LEAVE_REQUEST");
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const employeeId = searchParams.get("employeeId") ?? "";
  const selfEmployee = normalizeRole(user?.role) === "EMPLOYEE" && user?.employeeId != null ? String(user.employeeId) : "";
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const [statusDraft, setStatusDraft] = useState("");
  const [status, setStatus] = useState("");
  const [typeDraft, setTypeDraft] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [fromDraft, setFromDraft] = useState("");
  const [toDraft, setToDraft] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [employeeDraft, setEmployeeDraft] = useState(employeeId);
  const [employeeFilter, setEmployeeFilter] = useState(employeeId);
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ leaveTypeId: "", startDate: "", endDate: "", comment: "", employeeId: selfEmployee || employeeId });
  const [rejecting, setRejecting] = useState<Record<string, unknown> | null>(null);
  const [reason, setReason] = useState("");
  const [leaveErrors, setLeaveErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    scrollContentTop();
  }, [page]);

  const canPickEmployee = hasPermission(user, "EMPLOYEES_VIEW") || hasPermission(user, "LEAVE_APPROVE");
  const people = useQuery({
    queryKey: ["lookup", "employees"],
    enabled: canPickEmployee,
    queryFn: () => listResource<Record<string, unknown>>("/employees", { page: 0, size: 500 }),
  });
  const list = useQuery({
    queryKey: ["leave-requests", q, status, leaveTypeId, from, to, page, employeeFilter],
    queryFn: () =>
      listResource<Record<string, unknown>>("/leave-requests", {
        q,
        status,
        leaveTypeId,
        from,
        to,
        page,
        size: 20,
        employeeId: employeeFilter,
      }),
  });
  const types = useQuery({
    queryKey: ["leave-types"],
    queryFn: () => listResource<Record<string, unknown>>("/leave-types", { page: 0, size: 50 }),
  });

  const create = useMutation({
    mutationFn: () => createResource("/leave-requests", form),
    onSuccess: () => {
      toast.success("Demande envoyée — le solde ne bougera qu’après approbation.");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const decide = useMutation({
    mutationFn: ({ id, action, comment }: { id: string; action: "approve" | "reject"; comment?: string }) =>
      apiFetch(`/leave-requests/${id}/${action}`, {
        method: "POST",
        body: JSON.stringify({ comment }),
      }),
    onSuccess: () => {
      toast.success("Décision enregistrée");
      setRejecting(null);
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => apiFetch(`/leave-requests/${id}/cancel`, { method: "POST", body: "{}" }),
    onSuccess: () => {
      toast.success("Demande annulée, solde recrédité si besoin");
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
      qc.invalidateQueries({ queryKey: ["leave-balances"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Demandes de congé"
        subtitle="Circuit manager : en attente → approuvé / refusé"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                downloadNamed(`/reports/leave?year=${new Date().getFullYear()}`, "conges.xlsx").catch((e: Error) => toast.error(e.message))
              }
            >
              Excel
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                downloadNamed(`/reports/leave.pdf?year=${new Date().getFullYear()}`, "conges.pdf").catch((e: Error) => toast.error(e.message))
              }
            >
              PDF
            </Button>
            {canRequest ? (
            <Button
              onClick={() => {
                setForm({
                  leaveTypeId: "",
                  startDate: "",
                  endDate: "",
                  comment: "",
                  employeeId: selfEmployee || employeeFilter,
                });
                setLeaveErrors({});
                setOpen(true);
              }}
            >
              Nouvelle demande
            </Button>
            ) : null}
          </div>
        }
      />
      {list.isLoading && !list.data ? <Spinner /> : null}
      {list.isError ? <ErrorState message={(list.error as Error).message} onRetry={() => list.refetch()} /> : null}
      {list.data ? (
        <div className="overflow-x-auto rounded-2xl border border-indigo-50 bg-white card-shadow">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-indigo-50/70 text-xs uppercase text-indigo-800">
              <tr>
                <th className="px-4 py-3 text-start">
                  <span className="flex items-center gap-1">
                    {tr("Employé")}
                    <ColumnFilter
                      label="Recherche"
                      active={Boolean(q)}
                      onOpen={() => setDraft(q)}
                      onSearch={() => {
                        setPage(0);
                        setQ(draft.trim());
                      }}
                      onReset={() => {
                        setPage(0);
                        setDraft("");
                        setQ("");
                      }}
                    >
                      <Input value={draft} placeholder="Nom de l’employé" onChange={(e) => setDraft(e.target.value)} />
                    </ColumnFilter>
                    {canPickEmployee ? (
                      <ColumnFilter
                        label="Employé"
                        active={Boolean(employeeFilter)}
                        onOpen={() => setEmployeeDraft(employeeFilter)}
                        onSearch={() => {
                          setPage(0);
                          setEmployeeFilter(employeeDraft);
                        }}
                        onReset={() => {
                          setPage(0);
                          setEmployeeDraft("");
                          setEmployeeFilter("");
                        }}
                      >
                        <SearchableSelect
                          value={employeeDraft}
                          onChange={setEmployeeDraft}
                          placeholder="Employé"
                          emptyLabel="Tous"
                          searchPlaceholder="Nom ou e-mail"
                          options={(people.data?.content ?? []).map((row) => ({
                            value: idOf(row),
                            label: fullName(row),
                            hint: String(row.email ?? ""),
                          }))}
                        />
                      </ColumnFilter>
                    ) : null}
                  </span>
                </th>
                <th className="px-4 py-3 text-start">
                  <span className="flex items-center gap-1">
                    {tr("Type")}
                    <ColumnFilter
                      label="Type"
                      active={Boolean(leaveTypeId)}
                      onOpen={() => setTypeDraft(leaveTypeId)}
                      onSearch={() => {
                        setPage(0);
                        setLeaveTypeId(typeDraft);
                      }}
                      onReset={() => {
                        setPage(0);
                        setTypeDraft("");
                        setLeaveTypeId("");
                      }}
                    >
                      <SearchableSelect
                        value={typeDraft}
                        onChange={setTypeDraft}
                        placeholder="Type"
                        emptyLabel="Tous"
                        searchPlaceholder="Type"
                        options={(types.data?.content ?? []).map((row) => ({
                          value: idOf(row),
                          label: String(row.name ?? ""),
                        }))}
                      />
                    </ColumnFilter>
                  </span>
                </th>
                <th className="px-4 py-3 text-start">
                  <span className="flex items-center gap-1">
                    {tr("Du")}
                    <ColumnFilter
                      label="Du"
                      active={Boolean(from)}
                      onOpen={() => setFromDraft(from)}
                      onSearch={() => {
                        setPage(0);
                        setFrom(fromDraft);
                      }}
                      onReset={() => {
                        setPage(0);
                        setFromDraft("");
                        setFrom("");
                      }}
                    >
                      <Input type="date" value={fromDraft} onChange={(e) => setFromDraft(e.target.value)} />
                    </ColumnFilter>
                  </span>
                </th>
                <th className="px-4 py-3 text-start">
                  <span className="flex items-center gap-1">
                    {tr("Au")}
                    <ColumnFilter
                      label="Au"
                      active={Boolean(to)}
                      onOpen={() => setToDraft(to)}
                      onSearch={() => {
                        setPage(0);
                        setTo(toDraft);
                      }}
                      onReset={() => {
                        setPage(0);
                        setToDraft("");
                        setTo("");
                      }}
                    >
                      <Input type="date" value={toDraft} onChange={(e) => setToDraft(e.target.value)} />
                    </ColumnFilter>
                  </span>
                </th>
                <th className="px-4 py-3 text-start">{tr("Jours")}</th>
                <th className="px-4 py-3 text-start">
                  <span className="flex items-center gap-1">
                    {tr("Statut")}
                    <ColumnFilter
                      label="Statut"
                      active={Boolean(status)}
                      onOpen={() => setStatusDraft(status)}
                      onSearch={() => {
                        setPage(0);
                        setStatus(statusDraft);
                      }}
                      onReset={() => {
                        setPage(0);
                        setStatusDraft("");
                        setStatus("");
                      }}
                    >
                      <SearchableSelect
                        value={statusDraft}
                        onChange={setStatusDraft}
                        placeholder="Statut"
                        emptyLabel="Tous"
                        searchPlaceholder="Statut"
                        options={[
                          { value: "PENDING", label: "En attente" },
                          { value: "APPROVED", label: "Approuvé" },
                          { value: "REJECTED", label: "Refusé" },
                          { value: "CANCELLED", label: "Annulé" },
                        ]}
                      />
                    </ColumnFilter>
                  </span>
                </th>
                <th className="px-4 py-3 text-start">{tr("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {list.data.content.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-indigo-400">
                    Aucune demande pour ces filtres.
                  </td>
                </tr>
              ) : null}
              {list.data.content.map((row) => (
                <tr key={idOf(row)} className="border-t border-indigo-50">
                  <td className="px-4 py-3">{fullName(asRecord(row.employee) || row)}</td>
                  <td className="px-4 py-3">{String(asRecord(row.leaveType).name ?? row.type ?? "—")}</td>
                  <td className="px-4 py-3">{formatDate(String(row.startDate ?? ""))}</td>
                  <td className="px-4 py-3">{formatDate(String(row.endDate ?? ""))}</td>
                  <td className="px-4 py-3">{String(row.days ?? row.workingDays ?? "—")}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(String(row.status))}>{String(row.status)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {String(row.status) === "APPROVED" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            downloadNamed(`/leave-requests/${idOf(row)}/pdf`, `conge-${idOf(row)}.pdf`).catch((e: Error) =>
                              toast.error(e.message),
                            )
                          }
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {canApprove && String(row.status) === "PENDING" ? (
                        <>
                          <Button size="sm" {...actionLock(decide.isPending, decide.variables, idOf(row))} onClick={() => decide.mutateAsync({ id: idOf(row), action: "approve" })}>
                            {admin ? "Approuver" : "Valider"}
                          </Button>
                          <Button size="sm" variant="danger" disabled={decide.isPending} onClick={() => setRejecting(row)}>
                            Refuser
                          </Button>
                        </>
                      ) : admin && String(row.status) === "MANAGER_APPROVED" ? (
                        <>
                          <Button size="sm" {...actionLock(decide.isPending, decide.variables, idOf(row))} onClick={() => decide.mutateAsync({ id: idOf(row), action: "approve" })}>
                            Approuver
                          </Button>
                          <Button size="sm" variant="danger" disabled={decide.isPending} onClick={() => setRejecting(row)}>
                            Refuser
                          </Button>
                        </>
                      ) : canRequest && (String(row.status) === "PENDING" || String(row.status) === "APPROVED") ? (
                        <Button size="sm" variant="outline" {...actionLock(cancel.isPending, cancel.variables, idOf(row))} onClick={() => cancel.mutateAsync(idOf(row))}>
                          Annuler
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end gap-2 px-4 py-3">
            <Button size="sm" variant="outline" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
              Précédent
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page + 1 >= (list.data.totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      ) : null}

      <Modal
        open={open}
        title="Demande de congé"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                const next: Record<string, string> = {};
                if (canPickEmployee && !selfEmployee && !form.employeeId) next.employeeId = "Choisissez un employé.";
                if (!form.leaveTypeId) next.leaveTypeId = "Choisissez un type de congé.";
                if (!form.startDate) next.startDate = "Date de début obligatoire.";
                if (!form.endDate) next.endDate = "Date de fin obligatoire.";
                if (form.startDate && form.endDate && form.endDate < form.startDate) {
                  next.endDate = "La fin doit être après le début.";
                }
                setLeaveErrors(next);
                if (Object.keys(next).length) {
                  toast.error(Object.values(next)[0]);
                  return;
                }
                return create.mutateAsync();
              }}
              loading={create.isPending}
              disabled={create.isPending}
            >
              Envoyer
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          {canPickEmployee && !selfEmployee ? (
            <Field label="Employé" error={leaveErrors.employeeId}>
              <SearchableSelect
                value={form.employeeId}
                disabled={Boolean(employeeFilter)}
                invalid={Boolean(leaveErrors.employeeId)}
                onChange={(v) => {
                  setForm({ ...form, employeeId: v });
                  setLeaveErrors((s) => ({ ...s, employeeId: "" }));
                }}
                placeholder={employeeFilter ? "Employé sélectionné" : "Rechercher employé…"}
                searchPlaceholder="Nom ou e-mail"
                options={(people.data?.content ?? []).map((row) => ({
                  value: idOf(row),
                  label: fullName(row),
                  hint: String(row.email ?? ""),
                }))}
              />
            </Field>
          ) : null}
          <Field label="Type" error={leaveErrors.leaveTypeId}>
            <SearchableSelect
              value={form.leaveTypeId}
              invalid={Boolean(leaveErrors.leaveTypeId)}
              onChange={(v) => {
                setForm({ ...form, leaveTypeId: v });
                setLeaveErrors((s) => ({ ...s, leaveTypeId: "" }));
              }}
              placeholder="Type de congé"
              options={(types.data?.content ?? []).map((t) => ({
                value: idOf(t),
                label: String(t.name ?? t.code ?? "Type"),
              }))}
            />
          </Field>
          <Field label="Début" error={leaveErrors.startDate}>
            <Input invalid={Boolean(leaveErrors.startDate)} type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </Field>
          <Field label="Fin" error={leaveErrors.endDate}>
            <Input invalid={Boolean(leaveErrors.endDate)} type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </Field>
          <Field label="Commentaire">
            <Textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
          </Field>
        </div>
      </Modal>
      {rejecting ? (
        <Modal
          open
          title="Refuser la demande"
          onClose={() => setRejecting(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => setRejecting(null)}>
                Annuler
              </Button>
              <Button
                variant="danger"
                loading={decide.isPending}
                disabled={decide.isPending}
                onClick={() => decide.mutateAsync({ id: idOf(rejecting), action: "reject", comment: reason })}
              >
                Refuser
              </Button>
            </>
          }
        >
          <p className="mb-3 text-sm text-indigo-800">{tr("Le solde ne sera pas débité.")}</p>
          <Field label="Motif">
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </Modal>
      ) : null}
    </div>
  );
}

export function LeaveCalendarPage() {
  const [cursor, setCursor] = useState(new Date());
  const from = format(startOfMonth(cursor), "yyyy-MM-dd");
  const to = format(endOfMonth(cursor), "yyyy-MM-dd");
  const q = useQuery({
    queryKey: ["leave-calendar", from, to],
    queryFn: () =>
      listResource<Record<string, unknown>>("/leave-requests", {
        from,
        to,
        status: "APPROVED",
        page: 0,
        size: 200,
      }),
  });
  const days = useMemo(() => eachDayOfInterval({ start: startOfMonth(cursor), end: endOfMonth(cursor) }), [cursor]);
  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of q.data?.content ?? []) {
      const s = String(row.startDate ?? "").slice(0, 10);
      if (s) map.set(s, (map.get(s) ?? 0) + 1);
    }
    return map;
  }, [q.data]);

  return (
    <div>
      <PageHeader
        title="Calendrier des congés"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
              Mois précédent
            </Button>
            <Button variant="outline" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
              Mois suivant
            </Button>
          </div>
        }
      />
      {q.isLoading ? <Spinner variant="calendar" /> : (
      <>
      <p className="mb-4 font-semibold capitalize">{format(cursor, "MMMM yyyy", { locale: fr })}</p>
      <div className="grid grid-cols-7 gap-2">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
          <div key={d} className="text-center text-xs font-bold text-indigo-400">
            {d}
          </div>
        ))}
        {Array.from({ length: (startOfMonth(cursor).getDay() + 6) % 7 }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const n = byDay.get(key) ?? 0;
          return (
            <div
              key={key}
              className={`rounded-xl border p-2 text-sm ${isSameMonth(d, cursor) ? "bg-white" : "bg-slate-50"} ${n ? "border-violet-300" : "border-indigo-50"}`}
            >
              <div className="font-semibold">{format(d, "d")}</div>
              {n ? <div className="text-xs text-violet-700">{n} congé(s)</div> : null}
            </div>
          );
        })}
      </div>
      </>
      )}
    </div>
  );
}
