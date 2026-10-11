import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { homeForUser, useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { DEMO_ACCOUNTS } from "@/lib/types";
import { createResource } from "@/lib/api";
import { Button, Field, Input } from "@/components/ui";
import { fieldError, isEmail, isIce, isPassword } from "@/lib/validate";

const demo = import.meta.env.VITE_DEMO_MODE !== "false";

export function AuthFrame({ title, children }: { title: string; children: ReactNode }) {
  const { lang, toggle, tr } = useI18n();
  return (
    <div className="auth-grid grid min-h-screen place-items-center px-4 py-10">
      <div className="auth-card w-full max-w-md rounded-2xl border border-[#e5e5e5] bg-white p-8 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="text-sm font-semibold text-[#6e2a72]">
            ← RHFlow Maroc
          </Link>
          <button type="button" className="text-sm font-semibold text-[#0a0a0a]" onClick={toggle}>
            {lang === "fr" ? "العربية" : "Français"}
          </button>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-[#0a0a0a]">{tr(title)}</h1>
        {children}
      </div>
    </div>
  );
}

export function LoginPage() {
  const { t } = useI18n();
  const { login, isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) navigate(homeForUser(user), { replace: true });
  }, [loading, isAuthenticated, navigate, user]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!isEmail(email)) next.email = t("invalidEmail");
    if (!password) next.password = t("passwordRequired");
    setFieldErrors(next);
    if (Object.keys(next).length) {
      setError(t("checkFields"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const u = await login(email, password, remember);
      navigate(homeForUser(u), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loginFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame title={t("login")}>
      <p className="mt-1 text-sm text-indigo-900/60">{t("companySpace")}</p>
      {demo ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
          <p className="font-semibold">{t("demoAccounts")}</p>
          <ul className="mt-2 space-y-1 font-mono">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <button
                  type="button"
                  className="text-start hover:underline"
                  onClick={() => {
                    setEmail(a.email);
                    setPassword(a.password);
                  }}
                >
                  {a.email} / {a.password} · {a.role}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <form className="mt-6 grid gap-3" onSubmit={onSubmit}>
        <Field label={t("email")} error={fieldErrors.email}>
          <Input invalid={Boolean(fieldErrors.email)} type="email" required value={email} onChange={(e) => { setEmail(e.target.value); setFieldErrors((s) => ({ ...s, email: "" })); }} autoComplete="username" />
        </Field>
        <Field label={t("password")} error={fieldErrors.password}>
          <Input invalid={Boolean(fieldErrors.password)} type="password" required value={password} onChange={(e) => { setPassword(e.target.value); setFieldErrors((s) => ({ ...s, password: "" })); }} autoComplete="current-password" />
        </Field>
        <label className="flex items-center gap-2 text-sm text-indigo-800">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          {t("rememberMe")}
        </label>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <Button type="submit" disabled={busy}>
          {busy ? t("signingIn") : t("signIn")}
        </Button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <Link className="text-violet-700" to="/forgot-password">
          {t("forgot")}
        </Link>
        <Link className="text-violet-700" to="/register">
          {t("createCompany")}
        </Link>
      </div>
    </AuthFrame>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    companyName: "",
    ice: "",
    city: "Casablanca",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
    setErrors((s) => {
      const n = { ...s };
      delete n[k];
      return n;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(form)) {
      const msg = fieldError(k, v, {
        required: k !== "ice",
        type: k === "email" ? "email" : k === "password" ? "password" : undefined,
        sibling: form,
      });
      if (msg) next[k] = msg;
    }
    if (form.ice && !isIce(form.ice)) next.ice = "L’ICE doit contenir 15 chiffres.";
    if (form.password && !isPassword(form.password)) next.password = "Au moins 8 caractères, une lettre et un chiffre.";
    setErrors(next);
    if (Object.keys(next).length) {
      toast.error(Object.values(next)[0]);
      return;
    }
    setBusy(true);
    try {
      await createResource("/auth/register", form);
      toast.success("Société créée. Vous pouvez vous connecter.");
      navigate("/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Inscription impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame title="Essai 14 jours">
      <form className="mt-6 grid gap-3" onSubmit={onSubmit}>
        <Field label="Raison sociale" error={errors.companyName}>
          <Input invalid={Boolean(errors.companyName)} required value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
        </Field>
        <Field label="ICE" error={errors.ice} hint="15 chiffres, facultatif à l’inscription">
          <Input invalid={Boolean(errors.ice)} value={form.ice} onChange={(e) => set("ice", e.target.value)} maxLength={15} inputMode="numeric" />
        </Field>
        <Field label="Ville" error={errors.city}>
          <Input invalid={Boolean(errors.city)} required value={form.city} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field label="Prénom admin" error={errors.firstName}>
          <Input invalid={Boolean(errors.firstName)} required value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
        </Field>
        <Field label="Nom admin" error={errors.lastName}>
          <Input invalid={Boolean(errors.lastName)} required value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </Field>
        <Field label="E-mail" error={errors.email}>
          <Input invalid={Boolean(errors.email)} type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Mot de passe" error={errors.password} hint="8 caractères min., lettre + chiffre">
          <Input invalid={Boolean(errors.password)} type="password" required value={form.password} onChange={(e) => set("password", e.target.value)} />
        </Field>
        <Button type="submit" disabled={busy}>
          Créer ma société
        </Button>
      </form>
    </AuthFrame>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isEmail(email)) {
      toast.error("E-mail invalide.");
      return;
    }
    try {
      await createResource("/auth/forgot-password", { email });
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d’envoyer le lien");
    }
  }

  return (
    <AuthFrame title="Mot de passe oublié">
      {done ? (
        <p className="mt-4 text-sm">Si un compte existe, un lien a été envoyé.</p>
      ) : (
        <form className="mt-6 grid gap-3" onSubmit={onSubmit}>
          <Field label="E-mail">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit">Envoyer le lien</Button>
        </form>
      )}
    </AuthFrame>
  );
}

export function ResetPasswordPage() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const token = search.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Lien incomplet. Demandez un nouvel e-mail.");
      return;
    }
    if (!isPassword(password)) {
      setError("Au moins 8 caractères, une lettre et un chiffre.");
      return;
    }
    setError(null);
    try {
      await createResource("/auth/reset-password", { token, password });
      setDone(true);
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lien invalide");
    }
  }

  return (
    <AuthFrame title="Nouveau mot de passe">
      {done ? (
        <p className="mt-4 text-sm">Mot de passe mis à jour. Redirection vers la connexion…</p>
      ) : (
        <form className="mt-6 grid gap-3" onSubmit={onSubmit}>
          <Field label="Nouveau mot de passe" error={error} hint="8 caractères min., lettre + chiffre">
            <Input invalid={Boolean(error)} type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button type="submit" disabled={!token}>Enregistrer</Button>
        </form>
      )}
    </AuthFrame>
  );
}
