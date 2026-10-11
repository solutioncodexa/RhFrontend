import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Eye, Paperclip, Pencil, Plus, Trash2 } from "lucide-react";
import { ColumnFilter } from "./ColumnFilter";
import {
  apiFetch,
  createResource,
  deleteResource,
  downloadNamed,
  listResource,
  updateResource,
  uploadDocument,
} from "@/lib/api";
import { asRecord, cn, fullName, idOf, moneyMAD, pick, scrollContentTop } from "@/lib/utils";
import { collectErrors } from "@/lib/validate";
import { Badge, Button, ErrorState, Field, Input, PageHeader, Spinner, Textarea, statusTone } from "./ui";
import { SearchableSelect, type SearchOption } from "./SearchableSelect";
import { ConfirmDialog, Modal } from "./Modal";
import { useI18n } from "@/lib/i18n";
import { compressImage } from "@/lib/images";
import { useAuth } from "@/lib/auth";
import { normalizeRole } from "@/lib/types";

export type FieldType = "text" | "number" | "date" | "select" | "textarea" | "email" | "password";

export type FieldDef = {
  key: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  filter?: boolean;
  options?: { value: string; label: string }[];
  lookup?: "employees" | "departments" | "positions" | "leave-types" | "job-offers" | "users" | "establishments" | "shifts";
  hideInTable?: boolean;
  defaultValue?: string;
};

export type ResourceConfig = {
  path: string;
  title: string;
  subtitle?: string;
  queryKey: string;
  columns: { key: string; label: string; money?: boolean; status?: boolean; name?: boolean }[];
  fields: FieldDef[];
  createLabel?: string;
  searchPlaceholder?: string;
  readOnly?: boolean;
  extraFilters?: FieldDef[];
  defaultFilters?: Record<string, string>;
  createSections?: { title: string; fields: FieldDef[] }[];
  onboard?: boolean;
  afterCreate?: string;
  attachment?: "CONTRACT" | "DOCUMENT" | "RECEIPT";
  extraActions?: (row: Record<string, unknown>) => ReactNode;
  download?: (row: Record<string, unknown>) => string | null;
  exports?: { label: string; path: string; filename: string }[];
  headerActions?: ReactNode;
};

function generatableDocument(row: Record<string, unknown>) {
  const cat = String(row.category ?? "").toUpperCase();
  return cat.includes("CONTRACT") || cat.includes("CONTRAT") || cat.includes("ATTESTATION") || cat.includes("CERTIFICATE");
}

function downloadPath(config: ResourceConfig, row: Record<string, unknown>) {
  const custom = config.download?.(row);
  if (custom) return custom;
  if (config.attachment === "DOCUMENT" && (row.hasFile || generatableDocument(row))) {
    return `/documents/${idOf(row)}/file`;
  }
  if (row.documentId) return `/documents/${row.documentId}/file`;
  return null;
}

function useLookup(kind?: FieldDef["lookup"]) {
  const path =
    kind === "employees"
      ? "/employees"
      : kind === "departments"
        ? "/departments"
        : kind === "positions"
          ? "/positions"
          : kind === "leave-types"
            ? "/leave-types"
            : kind === "job-offers"
              ? "/job-offers"
              : kind === "users"
                ? "/users"
                : kind === "establishments"
                  ? "/establishments"
                  : kind === "shifts"
                    ? "/shifts"
                    : "";
  return useQuery({
    queryKey: ["lookup", kind],
    enabled: Boolean(kind),
    queryFn: () => listResource<Record<string, unknown>>(path, { page: 0, size: 500 }),
  });
}

function LookupSelect({
  field,
  value,
  onChange,
  emptyLabel,
  placeholder,
  invalid,
  pinned,
  disabled,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
  emptyLabel?: string;
  placeholder?: string;
  invalid?: boolean;
  pinned?: SearchOption;
  disabled?: boolean;
}) {
  const q = useLookup(field.lookup);
  const loaded: SearchOption[] =
    field.options ??
    (q.data?.content ?? []).map((row) => {
      const person = String(row.firstName ?? row.first_name ?? "").trim();
      const label = person
        ? fullName(row)
        : String(pick(row, ["name", "title", "code"]) ?? fullName(row));
      const email = String(row.email ?? "");
      return {
        value: idOf(row),
        label,
        hint: email && email !== label ? email : undefined,
      };
    });
  const options =
    pinned && !loaded.some((o) => o.value === pinned.value || (o.value !== "" && Number(o.value) === Number(pinned.value)))
      ? [pinned, ...loaded]
      : loaded;
  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      options={options}
      required={field.required}
      invalid={invalid}
      disabled={disabled}
      placeholder={disabled ? pinned?.label ?? placeholder ?? field.label : placeholder ?? `Rechercher ${field.label.toLowerCase()}…`}
      searchPlaceholder={`Rechercher ${field.label.toLowerCase()}…`}
      emptyLabel={emptyLabel}
    />
  );
}

function columnOwnsFilter(columnKey: string, fieldKey: string) {
  const parts = columnKey.toLowerCase().split("|");
  const bare = fieldKey.toLowerCase().replace(/id$/, "");
  return parts.some((part) => part === fieldKey.toLowerCase() || part === bare);
}

function FilterEditor({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.lookup) {
    return (
      <LookupSelect
        field={{ ...field, required: false }}
        value={value}
        onChange={onChange}
        emptyLabel="Tous"
        placeholder={field.label}
      />
    );
  }
  if (field.options) {
    return (
      <SearchableSelect
        value={value}
        onChange={onChange}
        placeholder={field.label}
        emptyLabel="Tous"
        searchPlaceholder={field.label}
        options={field.options}
      />
    );
  }
  return (
    <Input
      type={field.type === "date" ? "date" : "text"}
      value={value}
      placeholder={field.label}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function formFields(config: ResourceConfig, selfId: string) {
  return config.fields.filter((field) => {
    if (!selfId) return true;
    if (field.key === "employeeId" && field.lookup === "employees") return false;
    if (field.key === "status") return false;
    return true;
  });
}

function fieldValue(raw: string, field: FieldDef) {
  if (field.type === "number") return raw === "" ? null : Number(raw);
  return raw;
}

function relationId(row: Record<string, unknown>, key: string) {
  const direct = row[key];
  if (direct != null && direct !== "" && typeof direct !== "object") return String(direct);
  const rel = key.endsWith("Id") ? key.slice(0, -2) : "";
  const nested = asRecord(rel ? row[rel] : undefined);
  if (nested.id != null && nested.id !== "") return String(nested.id);
  return "";
}

function relationPin(row: Record<string, unknown>, key: string): SearchOption | undefined {
  const id = relationId(row, key);
  if (!id) return undefined;
  const rel = key.endsWith("Id") ? key.slice(0, -2) : "";
  const nested = asRecord(rel ? row[rel] : undefined);
  const person = fullName(nested);
  const named = String(pick(nested, ["name", "title", "code", "label"]) ?? "");
  const label = person !== "—" ? person : named || id;
  return { value: id, label, hint: String(nested.email ?? "") || undefined };
}

function formatField(value: unknown, field: FieldDef) {
  if (value == null || value === "") return "";
  if (Array.isArray(value) && field.type === "date" && value.length >= 3) {
    const [y, m, d] = value;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  if (typeof value === "object") {
    const id = asRecord(value).id;
    return id == null ? "" : String(id);
  }
  const text = String(value);
  if (field.type === "date") return text.slice(0, 10);
  if (field.type === "number") return text;
  return text;
}

function FieldControl({
  field,
  form,
  setForm,
  error,
  onClearError,
  pinned,
  locked,
}: {
  field: FieldDef;
  form: Record<string, string>;
  setForm: Dispatch<SetStateAction<Record<string, string>>>;
  error?: string;
  onClearError?: (key: string) => void;
  pinned?: SearchOption;
  locked?: boolean;
}) {
  const required = field.key === "endDate" ? ["CDD", "STAGE", "INTERIM"].includes(form.type ?? "") : field.required;
  function change(next: string) {
    if (locked) return;
    setForm((s) => ({ ...s, [field.key]: next }));
    onClearError?.(field.key);
  }
  return (
    <div className={cn(field.type === "textarea" && "sm:col-span-2")}>
      <Field label={field.label} error={error}>
        {field.type === "textarea" ? (
          <Textarea invalid={Boolean(error)} required={required} value={form[field.key] ?? ""} onChange={(e) => change(e.target.value)} />
        ) : field.lookup || field.options ? (
          <LookupSelect
            field={field}
            value={form[field.key] ?? ""}
            onChange={change}
            invalid={Boolean(error)}
            pinned={pinned}
            disabled={locked}
          />
        ) : (
          <Input
            type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "email" ? "email" : field.type === "password" ? "password" : "text"}
            required={required}
            invalid={Boolean(error)}
            maxLength={field.key === "ice" ? 15 : field.key === "rib" ? 24 : undefined}
            inputMode={["ice", "rib", "phone", "cnssNumber"].includes(field.key) ? "numeric" : undefined}
            value={form[field.key] ?? ""}
            onChange={(e) => change(e.target.value)}
          />
        )}
      </Field>
    </div>
  );
}

export function ResourcePage({ config, canWrite = true }: { config: ResourceConfig; canWrite?: boolean }) {
  const { t, tr } = useI18n();
  const { user } = useAuth();
  const selfId = normalizeRole(user?.role) === "EMPLOYEE" && user?.employeeId != null ? String(user.employeeId) : "";
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const linkedEmployee = searchParams.get("employeeId") ?? "";
  const baseline = useMemo(() => {
    const next: Record<string, string> = { ...(config.defaultFilters ?? {}) };
    if (linkedEmployee && config.fields.some((f) => f.key === "employeeId")) next.employeeId = linkedEmployee;
    return next;
  }, [config, linkedEmployee]);
  const [draftQuery, setDraftQuery] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [draftFilters, setDraftFilters] = useState<Record<string, string>>(baseline);
  const [filters, setFilters] = useState<Record<string, string>>(baseline);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [pins, setPins] = useState<Record<string, SearchOption>>({});
  const [file, setFile] = useState<File | null>(null);
  const [toDelete, setToDelete] = useState<Record<string, unknown> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    scrollContentTop();
  }, [page]);

  const params = useMemo(
    () => ({ q: q || undefined, page, size: 20, ...filters }),
    [q, page, filters],
  );

  const list = useQuery({
    queryKey: [config.queryKey, params],
    queryFn: () => listResource<Record<string, unknown>>(config.path, params),
  });

  const save = useMutation({
    mutationFn: async () => {
      const visible = [...formFields(config, selfId), ...(!editing ? (config.createSections ?? []).flatMap((s) => s.fields) : [])];
      const nextErrors = collectErrors(
        visible.map((f) => ({
          key: f.key,
          required: f.key === "password" && Boolean(editing) ? false : f.required,
          type: f.type,
        })),
        form,
      );
      if (Object.keys(nextErrors).length) {
        setErrors(nextErrors);
        const first = Object.values(nextErrors)[0];
        throw new Error(first);
      }
      setErrors({});
      const body: Record<string, unknown> = {};
      for (const f of config.fields) {
        if (selfId && (f.key === "employeeId" || f.key === "status")) continue;
        body[f.key] = fieldValue(form[f.key] ?? "", f);
      }
      if (selfId) {
        body.employeeId = selfId;
        if (!editing && config.fields.some((f) => f.key === "status")) body.status = "PENDING";
      }
      const prepared = file ? await compressImage(file) : null;
      if (!editing && config.onboard) {
        const contract: Record<string, unknown> = {};
        for (const section of config.createSections ?? []) {
          for (const f of section.fields) contract[f.key] = fieldValue(form[f.key] ?? "", f);
        }
        const payload = new FormData();
        payload.append("payload", new Blob([JSON.stringify({ ...body, contract })], { type: "application/json" }));
        if (prepared) payload.append("file", prepared);
        return apiFetch<Record<string, unknown>>("/employees/onboard", { method: "POST", body: payload });
      }
      const saved = editing
        ? await updateResource<Record<string, unknown>>(config.path, idOf(editing), body)
        : await createResource<Record<string, unknown>>(config.path, body);
      if (prepared && config.attachment) {
        const uploaded = await uploadDocument({
          file: prepared,
          employeeId: String(body.employeeId ?? saved.employeeId ?? ""),
          contractId: config.attachment === "CONTRACT" ? idOf(saved) : undefined,
          category: config.attachment === "CONTRACT" ? "CONTRACT" : config.attachment === "RECEIPT" ? "RECEIPT" : String(body.category ?? "OTHER"),
          name: prepared.name,
        });
        if (config.attachment === "RECEIPT" && uploaded?.id != null) {
          await updateResource(config.path, idOf(saved), { documentId: uploaded.id });
        }
      }
      return saved;
    },
    onSuccess: (created) => {
      const wasEdit = Boolean(editing);
      toast.success(wasEdit ? "Enregistré" : "Créé");
      setOpen(false);
      setEditing(null);
      setFile(null);
      qc.invalidateQueries({ queryKey: [config.queryKey] });
      if (!wasEdit && config.afterCreate) {
        navigate(config.afterCreate.replace("{id}", idOf(created)));
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => deleteResource(config.path, idOf(toDelete!)),
    onSuccess: () => {
      toast.success("Supprimé");
      setToDelete(null);
      qc.invalidateQueries({ queryKey: [config.queryKey] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function chosenEmployee() {
    if (selfId) return selfId;
    if (linkedEmployee && config.fields.some((f) => f.key === "employeeId")) return linkedEmployee;
    if (filters.employeeId && config.fields.some((f) => f.key === "employeeId")) return filters.employeeId;
    return "";
  }

  function employeeLocked(field: FieldDef) {
    if (field.key !== "employeeId" || field.lookup !== "employees") return false;
    if (selfId) return true;
    if (editing) return Boolean(form.employeeId);
    return Boolean(chosenEmployee());
  }

  function startCreate() {
    setEditing(null);
    setFile(null);
    const next: Record<string, string> = {};
    const fixed = chosenEmployee();
    if (fixed) next.employeeId = fixed;
    for (const section of config.createSections ?? []) {
      for (const f of section.fields) {
        if (f.defaultValue === "today") next[f.key] = new Date().toISOString().slice(0, 10);
        else if (f.defaultValue) next[f.key] = f.defaultValue;
      }
    }
    setPins({});
    setForm(next);
    setErrors({});
    setOpen(true);
  }

  function startEdit(row: Record<string, unknown>) {
    setEditing(row);
    const next: Record<string, string> = {};
    const nextPins: Record<string, SearchOption> = {};
    for (const f of config.fields) {
      if (f.lookup) {
        next[f.key] = relationId(row, f.key);
        const pin = relationPin(row, f.key);
        if (pin) nextPins[f.key] = pin;
      } else {
        const v = pick(row, [f.key, f.key.replace(/Id$/, ".id")]);
        next[f.key] = formatField(v, f);
      }
    }
    if (!next.employeeId && selfId) next.employeeId = selfId;
    setPins(nextPins);
    setForm(next);
    setErrors({});
    setOpen(true);
  }

  const filterFields = [...config.fields.filter((f) => f.filter && !(selfId && f.key === "employeeId")), ...(config.extraFilters ?? [])];
  const matchedKeys = new Set(
    filterFields.filter((field) => config.columns.some((column) => columnOwnsFilter(column.key, field.key))).map((field) => field.key),
  );
  const extraFilters = filterFields.filter((field) => !matchedKeys.has(field.key));

  function applyField(key: string) {
    setPage(0);
    setFilters((current) => ({ ...current, [key]: draftFilters[key] ?? "" }));
  }

  function resetField(key: string) {
    const next = baseline[key] ?? "";
    setPage(0);
    setDraftFilters((current) => ({ ...current, [key]: next }));
    setFilters((current) => ({ ...current, [key]: next }));
  }

  return (
    <div>
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        actions={
          <div className="flex flex-wrap gap-2">
            {config.headerActions}
            {(config.exports ?? []).map((item) => (
              <Button
                key={item.path}
                variant="outline"
                onClick={() => {
                  const year = new Date().getFullYear();
                  const joiner = item.path.includes("?") ? "&" : "?";
                  downloadNamed(`${item.path}${joiner}year=${year}`, item.filename).catch((e: Error) => toast.error(e.message));
                }}
              >
                {item.label}
              </Button>
            ))}
            {canWrite && !config.readOnly ? (
              <Button onClick={startCreate}>
                <Plus className="h-4 w-4" />
                {config.createLabel ?? t("create")}
              </Button>
            ) : null}
          </div>
        }
      />

      {list.isLoading && !list.data ? <Spinner /> : null}
      {list.isError ? (
        <ErrorState message={(list.error as Error).message} onRetry={() => list.refetch()} />
      ) : null}

      {list.data ? (
        <div className="overflow-x-auto rounded-2xl border border-indigo-50 bg-white card-shadow">
          <table className="w-full min-w-[640px] text-start text-sm">
            <thead className="bg-indigo-50/70 text-xs uppercase tracking-wide text-indigo-800">
              <tr>
                {config.columns.map((c, index) => (
                  <th key={c.key} className="px-4 py-3 text-start font-semibold">
                    <span className="flex items-center gap-1">
                      {tr(c.label)}
                      {index === 0 ? (
                        <ColumnFilter
                          label="Recherche"
                          active={Boolean(q)}
                          onOpen={() => setDraftQuery(q)}
                          onSearch={() => {
                            setPage(0);
                            setQ(draftQuery.trim());
                          }}
                          onReset={() => {
                            setPage(0);
                            setDraftQuery("");
                            setQ("");
                          }}
                        >
                          <Input
                            value={draftQuery}
                            placeholder={tr(config.searchPlaceholder ?? "Rechercher…")}
                            onChange={(e) => setDraftQuery(e.target.value)}
                          />
                        </ColumnFilter>
                      ) : null}
                      {filterFields
                        .filter((field) => columnOwnsFilter(c.key, field.key))
                        .map((field) => (
                          <ColumnFilter
                            key={field.key}
                            label={field.label}
                            active={Boolean(filters[field.key]) && filters[field.key] !== (baseline[field.key] ?? "")}
                            onOpen={() =>
                              setDraftFilters((current) => ({ ...current, [field.key]: filters[field.key] ?? "" }))
                            }
                            onSearch={() => applyField(field.key)}
                            onReset={() => resetField(field.key)}
                          >
                            <FilterEditor
                              field={field}
                              value={draftFilters[field.key] ?? ""}
                              onChange={(value) => setDraftFilters((current) => ({ ...current, [field.key]: value }))}
                            />
                          </ColumnFilter>
                        ))}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-start font-semibold">
                  <span className="flex items-center gap-1">
                    {t("actions")}
                    {extraFilters.map((field) => (
                      <ColumnFilter
                        key={field.key}
                        label={field.label}
                        active={Boolean(filters[field.key]) && filters[field.key] !== (baseline[field.key] ?? "")}
                        onOpen={() =>
                          setDraftFilters((current) => ({ ...current, [field.key]: filters[field.key] ?? "" }))
                        }
                        onSearch={() => applyField(field.key)}
                        onReset={() => resetField(field.key)}
                      >
                        <FilterEditor
                          field={field}
                          value={draftFilters[field.key] ?? ""}
                          onChange={(value) => setDraftFilters((current) => ({ ...current, [field.key]: value }))}
                        />
                      </ColumnFilter>
                    ))}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.data.content.length === 0 ? (
                <tr>
                  <td colSpan={config.columns.length + 1} className="px-4 py-10 text-center text-sm text-indigo-400">
                    {tr("Aucun résultat pour ces filtres.")}
                  </td>
                </tr>
              ) : null}
              {list.data.content.map((row) => (
                <tr key={idOf(row)} className="border-t border-indigo-50 transition-colors duration-150 hover:bg-indigo-50/40">
                  {config.columns.map((c) => {
                    const val = pick(row, c.key.split("|"));
                    let shown = "—";
                    if (c.money) shown = moneyMAD(val as number);
                    else if (c.name && val && typeof val === "object") shown = fullName(asRecord(val));
                    else if (c.status) {
                      return (
                        <td key={c.key} className="px-4 py-3">
                          <Badge tone={statusTone(String(val ?? ""))}>{tr(String(val ?? "—"))}</Badge>
                        </td>
                      );
                    } else if (val != null && typeof val !== "object") shown = String(val);
                    else if (val && typeof val === "object") shown = fullName(asRecord(val));
                    const employeeId = c.key.startsWith("employee")
                      ? String(row.employeeId ?? asRecord(row.employee).id ?? "")
                      : config.path === "/employees"
                        ? idOf(row)
                        : "";
                    return (
                      <td key={c.key} className="px-4 py-3 text-indigo-950">
                        {employeeId && (c.key.startsWith("employee") || c.key.startsWith("firstName")) ? (
                          <Link to={`/app/employees/${employeeId}`} className="font-medium text-indigo-700 hover:underline">
                            {shown}
                          </Link>
                        ) : (
                          shown
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {config.extraActions?.(row)}
                      {config.path === "/employees" ? (
                        <Link to={`/app/employees/${idOf(row)}`} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-50">
                          <Eye className="h-4 w-4" />
                          {tr("Fiche")}
                        </Link>
                      ) : null}
                      {downloadPath(config, row) ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const path = downloadPath(config, row);
                            if (!path) return;
                            const name = path.endsWith("/pdf")
                              ? `document-${idOf(row)}.pdf`
                              : String(row.originalName ?? row.name ?? "document");
                            downloadNamed(path, name).catch((e: Error) => toast.error(e.message));
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {canWrite && !config.readOnly ? (
                        <Button size="sm" variant="ghost" onClick={() => startEdit(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {canWrite && !config.readOnly ? (
                        <Button size="sm" variant="ghost" onClick={() => setToDelete(row)}>
                          <Trash2 className="h-4 w-4 text-rose-500" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-indigo-50 px-4 py-3 text-xs text-indigo-800">
            <span>
              {tr("Page")} {list.data.page + 1} / {Math.max(1, list.data.totalPages)} · {list.data.totalElements}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
                {t("previous")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page + 1 >= list.data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("next")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Modal
        open={open}
        wide={Boolean(config.createSections?.length)}
        title={editing ? t("edit") : config.createLabel ?? t("create")}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button disabled={save.isPending} onClick={() => save.mutate()}>
              {t("save")}
            </Button>
          </>
        }
      >
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          {formFields(config, selfId).map((f) => (
            <FieldControl
              key={f.key}
              field={f}
              form={form}
              setForm={setForm}
              error={errors[f.key]}
              pinned={pins[f.key]}
              locked={employeeLocked(f)}
              onClearError={(key) => setErrors((s) => {
                const n = { ...s };
                delete n[key];
                return n;
              })}
            />
          ))}
          {!editing
            ? (config.createSections ?? []).map((section) => (
                <div key={section.title} className="sm:col-span-2 space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
                  <h3 className="text-sm font-semibold text-indigo-950">{tr(section.title)}</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {section.fields.map((f) => (
                      <FieldControl
                        key={f.key}
                        field={f}
                        form={form}
                        setForm={setForm}
                        error={errors[f.key]}
                        onClearError={(key) => setErrors((s) => {
                          const n = { ...s };
                          delete n[key];
                          return n;
                        })}
                      />
                    ))}
                  </div>
                </div>
              ))
            : null}
          {config.attachment || config.onboard ? (
            <div className="sm:col-span-2">
              <Field label={config.attachment === "RECEIPT" ? "Justificatif (PDF ou image)" : config.onboard ? "Contrat signé (PDF, Word ou image)" : "Pièce jointe"}>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-indigo-200 bg-white px-3 py-3 text-sm text-indigo-800">
                  <Paperclip className="h-4 w-4" />
                  <span>{file ? file.name : "Choisir un fichier"}</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,application/pdf,image/*"
                    className="sr-only"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </Field>
            </div>
          ) : null}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Supprimer"
        message="Cette action est définitive. Confirmer la suppression ?"
        danger
        onClose={() => setToDelete(null)}
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}
