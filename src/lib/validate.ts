export function digits(value: string) {
  return value.replace(/\D/g, "");
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function isIce(value: string) {
  return /^\d{15}$/.test(digits(value)) && digits(value).length === 15;
}

export function isCin(value: string) {
  return /^[A-Za-z]{1,2}\d{4,8}$/.test(value.replace(/\s/g, ""));
}

export function isRib(value: string) {
  return /^\d{24}$/.test(digits(value));
}

export function isMaPhone(value: string) {
  const d = digits(value);
  return /^(212|0)?[5-8]\d{8}$/.test(d);
}

export function isPassword(value: string) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export function fieldError(
  key: string,
  raw: string,
  opts: { required?: boolean; type?: string; sibling?: Record<string, string> } = {},
): string | null {
  const value = raw.trim();
  const required =
    opts.required ||
    (key === "endDate" && ["CDD", "STAGE", "INTERIM"].includes(opts.sibling?.type ?? ""));
  if (!value) {
    return required ? "Ce champ est obligatoire." : null;
  }
  if (opts.type === "email" || /email/i.test(key)) {
    if (!isEmail(value)) return "E-mail invalide.";
  }
  if (opts.type === "password" || key === "password") {
    if (!isPassword(value)) return "Au moins 8 caractères, une lettre et un chiffre.";
  }
  if (key === "ice") {
    if (!isIce(value)) return "L’ICE doit contenir 15 chiffres.";
  }
  if (key === "cin") {
    if (!isCin(value)) return "CIN attendu : 1 à 2 lettres puis 4 à 8 chiffres.";
  }
  if (key === "rib") {
    if (!isRib(value)) return "Le RIB marocain comporte 24 chiffres.";
  }
  if (key === "phone" || key === "emergencyPhone") {
    if (!isMaPhone(value)) return "Numéro marocain invalide (ex. 06xxxxxxxx).";
  }
  if (key === "cnssNumber" && value) {
    if (!/^\d{6,12}$/.test(digits(value))) return "N° CNSS : 6 à 12 chiffres.";
  }
  if (opts.type === "number" || ["baseSalary", "amount", "minSalary", "maxSalary", "weeklyHours", "dependents", "childrenCount"].includes(key)) {
    const n = Number(value);
    if (Number.isNaN(n)) return "Nombre invalide.";
    if (["baseSalary", "amount"].includes(key) && n <= 0) return "Le montant doit être supérieur à 0.";
    if (key === "weeklyHours" && (n < 1 || n > 48)) return "Heures hebdomadaires entre 1 et 48.";
    if ((key === "dependents" || key === "childrenCount") && (n < 0 || n > 6)) return "Valeur entre 0 et 6.";
    if (key === "maxSalary" && opts.sibling?.minSalary) {
      const min = Number(opts.sibling.minSalary);
      if (!Number.isNaN(min) && n < min) return "Le maximum doit être ≥ au minimum.";
    }
  }
  if (key === "endDate" && opts.sibling?.startDate && value < opts.sibling.startDate) {
    return "La date de fin doit être après le début.";
  }
  if (key === "trialEnd" && opts.sibling?.trialStart && value < opts.sibling.trialStart) {
    return "La fin d’essai doit être après le début.";
  }
  return null;
}

export function collectErrors(
  fields: { key: string; required?: boolean; type?: string }[],
  form: Record<string, string>,
) {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const message = fieldError(field.key, form[field.key] ?? "", {
      required: field.required,
      type: field.type,
      sibling: form,
    });
    if (message) errors[field.key] = message;
  }
  return errors;
}
