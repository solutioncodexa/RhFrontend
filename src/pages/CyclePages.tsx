import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { apiFetch, listResource } from "@/lib/api";
import { asRecord, fullName, idOf, moneyMAD } from "@/lib/utils";
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Spinner } from "@/components/ui";
import { SearchableSelect } from "@/components/SearchableSelect";
import { hasPermission } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

const FIELDS = [
  { value: "ADDRESS", label: "Adresse" },
  { value: "CITY", label: "Ville" },
  { value: "PHONE", label: "Téléphone" },
  { value: "PERSONAL_EMAIL", label: "E-mail personnel" },
  { value: "RIB", label: "RIB" },
  { value: "MARITAL_STATUS", label: "Situation familiale" },
  { value: "DEPENDENTS", label: "Personnes à charge" },
  { value: "CHILDREN_COUNT", label: "Enfants" },
];

export function ProfileChangesPage({ portal = false }: { portal?: boolean }) {
  const { tr } = useI18n();
  const { user } = useAuth();
  const hr = hasPermission(user, "EMPLOYEES_EDIT") && !portal;
  const qc = useQueryClient();
  const [field, setField] = useState("ADDRESS");
  const [value, setValue] = useState("");
  const rows = useQuery({
    queryKey: ["profile-changes", portal],
    queryFn: () => apiFetch<Record<string, unknown>[]>("/profile-changes"),
  });
  const propose = useMutation({
    mutationFn: () => apiFetch("/profile-changes", { method: "POST", body: JSON.stringify({ field, value }) }),
    onSuccess: () => {
      toast.success("Demande envoyée à la RH");
      setValue("");
      qc.invalidateQueries({ queryKey: ["profile-changes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const decide = useMutation({
    mutationFn: (body: { id: string; status: string }) =>
      apiFetch(`/profile-changes/${body.id}/decide`, { method: "POST", body: JSON.stringify({ status: body.status }) }),
    onSuccess: () => {
      toast.success("Décision enregistrée");
      qc.invalidateQueries({ queryKey: ["profile-changes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const list = rows.data ?? [];
  return (
    <div>
      <PageHeader
        title={portal ? "Ma fiche" : "Corrections de fiche"}
        subtitle="Le salarié propose une adresse, un RIB ou une situation. La RH valide avant que la fiche change."
      />
      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Champ">
            <select className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm" value={field} onChange={(e) => setField(e.target.value)}>
              {FIELDS.map((item) => (
                <option key={item.value} value={item.value}>{tr(item.label)}</option>
              ))}
            </select>
          </Field>
          <Field label="Nouvelle valeur">
            <Input value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button onClick={() => propose.mutateAsync()} loading={propose.isPending} disabled={propose.isPending || !value.trim()}>
              Proposer
            </Button>
          </div>
        </div>
      </Card>
      {rows.isLoading ? <Spinner variant="cards" /> : null}
      {rows.isError ? <ErrorState message={(rows.error as Error).message} onRetry={() => rows.refetch()} /> : null}
      <div className="space-y-2">
        {list.map((row) => (
          <Card key={String(row.id)}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{hr ? fullName(asRecord(row.employee)) : tr(String(row.fieldLabel ?? row.field ?? ""))}</p>
                <p className="text-sm text-indigo-700">
                  {tr(String(row.fieldLabel ?? ""))} · {String(row.currentValue ?? "—")} → {String(row.proposedValue ?? "")}
                </p>
              </div>
              <Badge>{String(row.status ?? "")}</Badge>
            </div>
            {hr && String(row.status) === "PENDING" ? (
              <div className="mt-3 flex gap-2">
                <Button size="sm" loading={decide.isPending} disabled={decide.isPending} onClick={() => decide.mutateAsync({ id: String(row.id), status: "APPROVED" })}>Accepter</Button>
                <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => decide.mutateAsync({ id: String(row.id), status: "REJECTED" })}>Refuser</Button>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
      {list.length === 0 && !rows.isLoading ? <EmptyState title="Aucune demande" hint="Proposez une correction, la RH la valide." /> : null}
    </div>
  );
}

export function OrgChartPage() {
  const people = useQuery({
    queryKey: ["org-chart"],
    queryFn: () => listResource<Record<string, unknown>>("/employees", { page: 0, size: 500 }),
  });
  const rows = people.data?.content ?? [];
  const byManager = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const manager = String(row.managerId ?? "");
    const list = byManager.get(manager) ?? [];
    list.push(row);
    byManager.set(manager, list);
  }
  const ids = new Set(rows.map((row) => idOf(row)));
  const roots = rows.filter((row) => {
    const manager = String(row.managerId ?? "");
    return !manager || !ids.has(manager);
  });
  return (
    <div>
      <PageHeader title="Organigramme" subtitle="Hiérarchie lue depuis le manager de chaque fiche." />
      {people.isLoading ? <Spinner variant="rows" rows={6} /> : null}
      {people.isError ? <ErrorState message={(people.error as Error).message} onRetry={() => people.refetch()} /> : null}
      <div className="space-y-3">
        {roots.map((row) => (
          <OrgNode key={idOf(row)} row={row} byManager={byManager} depth={0} />
        ))}
      </div>
      {rows.length === 0 && !people.isLoading ? <EmptyState title="Aucun salarié" /> : null}
    </div>
  );
}

function OrgNode({
  row,
  byManager,
  depth,
}: {
  row: Record<string, unknown>;
  byManager: Map<string, Record<string, unknown>[]>;
  depth: number;
}) {
  const children = byManager.get(idOf(row)) ?? [];
  const position = asRecord(row.position);
  return (
    <div style={{ marginInlineStart: depth * 20 }}>
      <Card className="mb-2">
        <p className="font-semibold">{fullName(row)}</p>
        <p className="text-sm text-indigo-700">{String(position.title ?? position.name ?? row.status ?? "")}</p>
      </Card>
      {children.map((child) => (
        <OrgNode key={idOf(child)} row={child} byManager={byManager} depth={depth + 1} />
      ))}
    </div>
  );
}

export function TrainingPage() {
  const { user } = useAuth();
  const canEdit = hasPermission(user, "EMPLOYEES_EDIT");
  const qc = useQueryClient();
  const year = new Date().getFullYear();
  const [form, setForm] = useState({ title: "", provider: "", hours: "", cost: "" });
  const [enroll, setEnroll] = useState({ courseId: "", employeeId: "" });
  const data = useQuery({
    queryKey: ["training", year],
    queryFn: () => apiFetch<Record<string, unknown>>(`/training?year=${year}`),
  });
  const employees = useQuery({
    queryKey: ["training-employees"],
    queryFn: () => listResource<Record<string, unknown>>("/employees", { page: 0, size: 200 }),
    enabled: canEdit,
  });
  const create = useMutation({
    mutationFn: () => apiFetch("/training/courses", {
      method: "POST",
      body: JSON.stringify({
        title: form.title,
        provider: form.provider,
        hours: Number(form.hours || 0),
        cost: Number(form.cost || 0),
        year,
      }),
    }),
    onSuccess: () => {
      toast.success("Formation ajoutée");
      setForm({ title: "", provider: "", hours: "", cost: "" });
      qc.invalidateQueries({ queryKey: ["training"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const enrollMut = useMutation({
    mutationFn: () => apiFetch("/training/enrollments", { method: "POST", body: JSON.stringify(enroll) }),
    onSuccess: () => {
      toast.success("Salarié inscrit");
      qc.invalidateQueries({ queryKey: ["training"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const done = useMutation({
    mutationFn: (id: string) => apiFetch(`/training/enrollments/${id}/done`, { method: "POST", body: "{}" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["training"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const body = data.data ?? {};
  const courses = (Array.isArray(body.courses) ? body.courses : []) as Record<string, unknown>[];
  const enrollments = (Array.isArray(body.enrollments) ? body.enrollments : []) as Record<string, unknown>[];
  return (
    <div>
      <PageHeader
        title="Formation"
        subtitle="Le catalogue se compare à la taxe de formation déjà calculée sur les bulletins."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card><p className="text-sm text-indigo-700">TFP collectée {year}</p><p className="text-xl font-bold">{moneyMAD(Number(body.tfpCollected ?? 0))}</p></Card>
        <Card><p className="text-sm text-indigo-700">Dépensé en formations faites</p><p className="text-xl font-bold">{moneyMAD(Number(body.trainingSpend ?? 0))}</p></Card>
        <Card><p className="text-sm text-indigo-700">Écart</p><p className="text-xl font-bold">{moneyMAD(Number(body.tfpGap ?? 0))}</p></Card>
      </div>
      {canEdit ? (
        <Card className="mb-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Intitulé"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Organisme"><Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} /></Field>
            <Field label="Heures"><Input value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} /></Field>
            <Field label="Coût MAD"><Input value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></Field>
          </div>
          <Button className="mt-3" loading={create.isPending} onClick={() => create.mutateAsync()} disabled={create.isPending || !form.title.trim()}>Ajouter au catalogue</Button>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Field label="Formation">
              <SearchableSelect
                value={enroll.courseId}
                onChange={(v) => setEnroll({ ...enroll, courseId: v })}
                placeholder="Formation"
                searchPlaceholder="Intitulé"
                options={courses.map((course) => ({ value: String(course.id), label: String(course.title ?? "") }))}
              />
            </Field>
            <Field label="Salarié">
              <SearchableSelect
                value={enroll.employeeId}
                onChange={(v) => setEnroll({ ...enroll, employeeId: v })}
                placeholder="Salarié"
                searchPlaceholder="Nom"
                options={(employees.data?.content ?? []).map((person) => ({ value: idOf(person), label: fullName(person) }))}
              />
            </Field>
            <div className="flex items-end">
              <Button variant="outline" loading={enrollMut.isPending} onClick={() => enrollMut.mutateAsync()} disabled={enrollMut.isPending || !enroll.courseId || !enroll.employeeId}>Inscrire</Button>
            </div>
          </div>
        </Card>
      ) : null}
      {data.isLoading ? <Spinner variant="cards" /> : null}
      {data.isError ? <ErrorState message={(data.error as Error).message} onRetry={() => data.refetch()} /> : null}
      <div className="space-y-2">
        {enrollments.map((row) => (
          <Card key={String(row.id)}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{String(row.courseTitle ?? "")}</p>
                <p className="text-sm text-indigo-700">{fullName(asRecord(row.employee))} · {moneyMAD(Number(row.cost ?? 0))}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{String(row.status ?? "")}</Badge>
                {canEdit && String(row.status) !== "DONE" ? (
                  <Button size="sm" variant="outline" loading={done.isPending} disabled={done.isPending} onClick={() => done.mutateAsync(String(row.id))}>Marquer faite</Button>
                ) : null}
              </div>
            </div>
          </Card>
        ))}
      </div>
      {courses.length === 0 && !data.isLoading ? <EmptyState title="Catalogue vide" hint="Ajoutez une formation, puis inscrivez un salarié." /> : null}
    </div>
  );
}
