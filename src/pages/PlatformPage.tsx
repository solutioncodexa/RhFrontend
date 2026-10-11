import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { createResource, deleteResource, listResource, patchResource } from "@/lib/api";
import { asRecord, idOf } from "@/lib/utils";
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Spinner, statusTone } from "@/components/ui";
import { SearchableSelect } from "@/components/SearchableSelect";
import { Modal } from "@/components/Modal";
import { MOROCCAN_CITIES } from "@/lib/types";
import { isEmail, isIce, isPassword } from "@/lib/validate";

export function PlatformPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [payId, setPayId] = useState<string | null>(null);
  const [pay, setPay] = useState({ amount: "1290", method: "VIREMENT", extendDays: "30", note: "" });
  const [form, setForm] = useState({
    slug: "",
    name: "",
    ice: "",
    city: "Casablanca",
    plan: "ESSENTIEL",
    adminEmail: "",
    adminPassword: "",
    adminFirstName: "",
    adminLastName: "",
  });

  const tenants = useQuery({
    queryKey: ["platform-tenants"],
    queryFn: () => listResource<Record<string, unknown>>("/platform/tenants", { page: 0, size: 50 }),
  });

  const create = useMutation({
    mutationFn: () => {
      if (!form.slug.trim() || !form.name.trim()) throw new Error("Slug et nom obligatoires.");
      if (form.ice && !isIce(form.ice)) throw new Error("L’ICE doit contenir 15 chiffres.");
      if (!isEmail(form.adminEmail)) throw new Error("E-mail admin invalide.");
      if (!isPassword(form.adminPassword)) throw new Error("Mot de passe : 8 caractères, lettre et chiffre.");
      return createResource("/platform/tenants", form);
    },
    onSuccess: () => {
      toast.success("Société créée");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["platform-tenants"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const payment = useMutation({
    mutationFn: () => {
      if (!payId) throw new Error("Société manquante.");
      return createResource(`/platform/tenants/${payId}/payments`, {
        amount: Number(pay.amount) || 0,
        method: pay.method,
        extendDays: Number(pay.extendDays) || 30,
        note: pay.note,
      });
    },
    onSuccess: () => {
      toast.success("Paiement enregistré");
      setPayId(null);
      qc.invalidateQueries({ queryKey: ["platform-tenants"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteResource("/platform/tenants", id),
    onSuccess: () => {
      toast.success("Société supprimée");
      qc.invalidateQueries({ queryKey: ["platform-tenants"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      patchResource("/platform/tenants", id, { active }),
    onSuccess: () => {
      toast.success("Société mise à jour");
      qc.invalidateQueries({ queryKey: ["platform-tenants"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Console plateforme"
        subtitle="SUPER_ADMIN — isolation des sociétés, plans Essentiel / Pro / Entreprise"
        actions={<Button onClick={() => setOpen(true)}>Nouvelle société</Button>}
      />
      {tenants.isLoading ? <Spinner /> : null}
      {tenants.isError ? <ErrorState message={(tenants.error as Error).message} onRetry={() => tenants.refetch()} /> : null}
      {tenants.data?.content.length === 0 ? <EmptyState title="Aucune société" /> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {(tenants.data?.content ?? []).map((t) => {
          const row = asRecord(t);
          return (
            <Card key={idOf(row)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold">{String(row.name ?? row.legalName)}</h3>
                  <p className="text-sm text-indigo-600">{String(row.slug)} · {String(row.city ?? "")}</p>
                  <p className="text-xs">ICE {String(row.ice ?? "—")}</p>
                  <p className="text-xs text-indigo-500">
                    Quotas {String(row.maxEmployees ?? "—")} salariés · {String(row.maxUsers ?? "—")} utilisateurs
                  </p>
                </div>
                <Badge tone={statusTone(row.active === false ? "EXPIRED" : "ACTIVE")}>
                  {String(row.plan ?? "ESSENTIEL")}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggle.mutate({ id: idOf(row), active: row.active === false })}
                >
                  {row.active === false ? "Activer" : "Désactiver"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPayId(idOf(row))}>
                  Paiement
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (window.confirm("Supprimer cette société et ses données ?")) {
                      remove.mutate(idOf(row));
                    }
                  }}
                >
                  Supprimer
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      <Modal
        open={open}
        title="Créer une société"
        onClose={() => setOpen(false)}
        footer={<Button onClick={() => create.mutate()}>Créer</Button>}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Slug">
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </Field>
          <Field label="Nom">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="ICE">
            <Input value={form.ice} onChange={(e) => setForm({ ...form, ice: e.target.value })} />
          </Field>
          <Field label="Ville">
            <SearchableSelect
              value={form.city}
              onChange={(v) => setForm({ ...form, city: v })}
              placeholder="Ville"
              options={MOROCCAN_CITIES.map((c) => ({ value: c, label: c }))}
            />
          </Field>
          <Field label="Plan">
            <SearchableSelect
              value={form.plan}
              onChange={(v) => setForm({ ...form, plan: v })}
              options={[
                { value: "ESSENTIEL", label: "Essentiel" },
                { value: "PRO", label: "Pro" },
                { value: "ENTREPRISE", label: "Entreprise" },
              ]}
            />
          </Field>
          <Field label="Admin e-mail">
            <Input type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
          </Field>
          <Field label="Admin mot de passe">
            <Input type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} />
          </Field>
          <Field label="Prénom">
            <Input value={form.adminFirstName} onChange={(e) => setForm({ ...form, adminFirstName: e.target.value })} />
          </Field>
          <Field label="Nom">
            <Input value={form.adminLastName} onChange={(e) => setForm({ ...form, adminLastName: e.target.value })} />
          </Field>
        </div>
      </Modal>
      <Modal
        open={Boolean(payId)}
        title="Enregistrer un virement"
        onClose={() => setPayId(null)}
        footer={<Button onClick={() => payment.mutate()}>Enregistrer</Button>}
      >
        <div className="grid gap-3">
          <Field label="Montant MAD">
            <Input value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
          </Field>
          <Field label="Méthode">
            <Input value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })} />
          </Field>
          <Field label="Prolonger (jours)">
            <Input value={pay.extendDays} onChange={(e) => setPay({ ...pay, extendDays: e.target.value })} />
          </Field>
          <Field label="Note">
            <Input value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
