import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch, uploadImage } from "@/lib/api";
import { ImageWell } from "@/components/ImageWell";
import { asRecord } from "@/lib/utils";
import { MOROCCAN_CITIES } from "@/lib/types";
import { isEmail, isIce, isMaPhone } from "@/lib/validate";
import { Button, Card, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { SearchableSelect } from "@/components/SearchableSelect";
import { HolidaysPage, LeaveTypesPage } from "./CatalogPages";
import { useI18n } from "@/lib/i18n";

export function SettingsPage() {
  const { tr } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [logoStamp, setLogoStamp] = useState(0);

  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      try {
        return await apiFetch<Record<string, unknown>>("/settings");
      } catch {
        return apiFetch<Record<string, unknown>>("/company");
      }
    },
  });

  useEffect(() => {
    if (!settings.data) return;
    const o = asRecord(settings.data);
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(o)) {
      if (v == null || typeof v === "object") continue;
      next[k] = String(v);
    }
    setForm((s) => ({ ...s, ...next }));
  }, [settings.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (form.ice && !isIce(form.ice)) throw new Error("L’ICE doit contenir 15 chiffres.");
      if (form.email && !isEmail(form.email)) throw new Error("E-mail société invalide.");
      if (form.phone && !isMaPhone(form.phone)) throw new Error("Téléphone marocain invalide.");
      const body = { ...form };
      delete body.whatsappAccessToken;
      delete body.whatsappToken;
      try {
        return await apiFetch("/settings", { method: "PUT", body: JSON.stringify(body) });
      } catch {
        return apiFetch("/company", { method: "PUT", body: JSON.stringify(body) });
      }
    },
    onSuccess: () => {
      toast.success("Paramètres enregistrés");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const logo = useMutation({
    mutationFn: (file: File) => uploadImage("/settings/logo", file),
    onSuccess: () => {
      toast.success("Logo enregistré");
      setLogoStamp((n) => n + 1);
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function f(key: string, label: string, extra?: { type?: string; area?: boolean }) {
    return (
      <Field label={label}>
        {extra?.area ? (
          <Textarea value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
        ) : (
          <Input
            type={extra?.type ?? "text"}
            value={form[key] ?? ""}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          />
        )}
      </Field>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Paramètres société" subtitle="Devise MAD · fuseau Africa/Casablanca" />
      <Card>
        <h2 className="mb-4 font-semibold">{tr("Identité")}</h2>
        <div className="mb-4">
          <ImageWell
            label="Logo"
            path={form.hasLogo === "true" ? "/settings/logo" : null}
            stamp={logoStamp}
            maxEdge={512}
            busy={logo.isPending}
            onFile={(file) => logo.mutate(file)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {f("name", "Nom commercial")}
          {f("legalName", "Raison sociale")}
          {f("ice", "ICE (15 chiffres)")}
          {f("taxId", "IF")}
          {f("rc", "RC")}
          {f("cnssAffiliation", "Affiliation CNSS")}
          {f("email", "E-mail", { type: "email" })}
          {f("phone", "Téléphone")}
          {f("address", "Adresse")}
          <Field label="Ville">
            <SearchableSelect
              value={form.city ?? ""}
              onChange={(v) => setForm({ ...form, city: v })}
              placeholder="Ville"
              options={[
                ...MOROCCAN_CITIES.map((c) => ({ value: c, label: c })),
                ...(form.city && !(MOROCCAN_CITIES as readonly string[]).includes(form.city)
                  ? [{ value: form.city, label: form.city }]
                  : []),
              ]}
            />
          </Field>
          {f("website", "Site")}
          {f("sector", "Secteur")}
          {f("currency", "Devise")}
        </div>
        <Button className="mt-4" onClick={() => save.mutate()}>
          Enregistrer
        </Button>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">{tr("WhatsApp Business")}</h2>
        <p className="mb-4 text-sm text-indigo-700">
          {tr("Le jeton Graph peut rester sur le serveur. Sans jeton, les messages sont journalisés en local. WhatsApp est inclus dès le plan Pro.")}
        </p>
        <p className="mb-4 text-sm text-indigo-900">
          {tr(form.featureWhatsapp === "true"
            ? "Ce plan inclut WhatsApp."
            : "WhatsApp est réservé aux plans Pro et Entreprise.")}
          {tr(form.whatsappTransportEnabled === "true"
            ? " Le transport serveur est activé."
            : " Le transport serveur est désactivé.")}
          {tr(form.whatsappTokenConfigured === "true" ? " Un jeton est configuré." : " Aucun jeton n’est configuré.")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {f("whatsappPhoneNumberId", "Identifiant du numéro")}
          {f("whatsappBusinessAccountId", "Identifiant du compte Business")}
          <Field label="Activer">
            <SearchableSelect
              value={form.featureWhatsapp === "true" ? (form.whatsappEnabled ?? "false") : "false"}
              onChange={(v) => setForm({ ...form, whatsappEnabled: v })}
              options={
                form.featureWhatsapp === "true"
                  ? [
                      { value: "false", label: "Non" },
                      { value: "true", label: "Oui" },
                    ]
                  : [{ value: "false", label: "Non — plan Pro requis" }]
              }
            />
          </Field>
        </div>
        <Button className="mt-4" variant="outline" onClick={() => save.mutate()}>
          Enregistrer WhatsApp
        </Button>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold">{tr("CIMR et mutuelle")}</h2>
        <p className="mb-3 text-sm text-indigo-700">{tr("Taux en décimal, par exemple 0.03 pour 3 %.")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {f("cimrEmployeeRate", "CIMR salarié")}
          {f("cimrEmployerRate", "CIMR employeur")}
          {f("mutualEmployeeRate", "Mutuelle salarié")}
          {f("mutualEmployerRate", "Mutuelle employeur")}
        </div>
        <Button className="mt-4" variant="outline" onClick={() => save.mutate()}>
          Enregistrer
        </Button>
      </Card>

      <HolidaysPage />
      <LeaveTypesPage />
    </div>
  );
}
