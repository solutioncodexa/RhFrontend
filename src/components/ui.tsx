import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { Children, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger" | "soft";
  size?: "sm" | "md" | "lg";
}) {
  const { tr } = useI18n();
  const label = Children.map(children, (child) => (typeof child === "string" ? tr(child) : child));
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition duration-200 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-5 text-base",
        variant === "primary" && "bg-[var(--role-accent)] text-[var(--role-on-accent)] hover:bg-[var(--role-accent-hover)] shadow-sm",
        variant === "outline" && "border border-[var(--role-line)] bg-[var(--role-card)] text-[var(--role-ink)] hover:bg-[var(--role-soft)]",
        variant === "ghost" && "text-[var(--role-ink)] hover:bg-[var(--role-soft)]",
        variant === "danger" && "bg-rose-600 text-white hover:bg-rose-500",
        variant === "soft" && "bg-[var(--role-soft)] text-[var(--role-ink)] hover:bg-[var(--role-line)]",
        className,
      )}
      {...props}
    >
      {label}
    </button>
  );
}

export function Input({ invalid, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-10 w-full rounded-xl border bg-white px-3 text-sm outline-none transition duration-200",
        invalid
          ? "border-rose-400 ring-4 ring-rose-200/80"
          : "control-field",
        className,
      )}
    />
  );
}

export function Textarea({ invalid, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(
        "min-h-24 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none transition duration-200",
        invalid
          ? "border-rose-400 ring-4 ring-rose-200/80"
          : "control-field",
        className,
      )}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "control-field h-10 w-full rounded-xl border bg-white px-3 text-sm outline-none",
        props.className,
      )}
    />
  );
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-semibold text-[#525252]">
      {children}
    </label>
  );
}

export function Field({
  label,
  children,
  error,
  hint,
}: {
  label: string;
  children: ReactNode;
  error?: string | null;
  hint?: string;
}) {
  const { tr } = useI18n();
  return (
    <div className={error ? "shake" : undefined}>
      <Label>{tr(label)}</Label>
      {children}
      {error ? <p className="mt-1 text-xs font-medium text-rose-600">{tr(error)}</p> : hint ? <p className="mt-1 text-xs text-indigo-400">{tr(hint)}</p> : null}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("card-shadow rounded-2xl border border-[var(--role-line)] bg-[var(--role-card)] p-5 transition duration-300 hover:shadow-lg", className)}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "bad" | "info";
}) {
  const { tr } = useI18n();
  const shown = typeof children === "string" ? tr(children) : children;
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        tone === "neutral" && "bg-slate-100 text-slate-700",
        tone === "ok" && "bg-emerald-50 text-emerald-700",
        tone === "warn" && "bg-amber-50 text-amber-800",
        tone === "bad" && "bg-rose-50 text-rose-700",
        tone === "info" && "bg-indigo-50 text-indigo-700",
      )}
    >
      {shown}
    </span>
  );
}

export function statusTone(status?: string) {
  const s = (status ?? "").toUpperCase();
  if (["ACTIVE", "APPROVED", "PAID", "PRESENT", "COMPLETED", "LOCKED", "HIRED", "DONE", "ACKNOWLEDGED", "OPEN"].includes(s)) return "ok" as const;
  if (["PENDING", "DRAFT", "CALCULATED", "LATE", "EXPIRING", "ON_LEAVE", "INTERVIEW"].includes(s)) return "warn" as const;
  if (["REJECTED", "ABSENT", "EXPIRED", "TERMINATED", "CANCELLED", "CLOSED"].includes(s)) return "bad" as const;
  return "info" as const;
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const { tr } = useI18n();
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3 dash-rise">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--role-ink)] sm:text-2xl">{tr(title)}</h1>
        {subtitle ? <p className="mt-1 text-sm text-indigo-900/60">{tr(subtitle)}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  const { tr } = useI18n();
  return (
    <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 px-6 py-12 text-center">
      <p className="font-semibold text-indigo-900">{tr(title)}</p>
      {hint ? <p className="mt-1 text-sm text-indigo-900/60">{tr(hint)}</p> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { tr } = useI18n();
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-8 text-center">
      <p className="font-semibold text-rose-800">{tr(message)}</p>
      {onRetry ? (
        <Button className="mt-4" variant="outline" onClick={onRetry}>
          Réessayer
        </Button>
      ) : null}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
    </div>
  );
}
