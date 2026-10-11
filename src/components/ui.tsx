import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { Children, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type MouseEvent, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  loading = false,
  disabled,
  onClick,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger" | "soft";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}) {
  const { tr } = useI18n();
  const lock = useRef(false);
  const [spinning, setSpinning] = useState(false);
  const busy = Boolean(loading || spinning || disabled);
  const label = Children.map(children, (child) => (typeof child === "string" ? tr(child) : child));

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (lock.current || disabled || loading) {
      event.preventDefault();
      return;
    }
    const result = onClick?.(event) as unknown;
    if (result && typeof (result as Promise<unknown>).then === "function") {
      lock.current = true;
      setSpinning(true);
      try {
        await result;
      } catch {
        // The action already reports its own error.
      } finally {
        lock.current = false;
        setSpinning(false);
      }
    }
  }

  return (
    <button
      {...props}
      type={type}
      disabled={busy}
      aria-busy={loading || spinning || undefined}
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
      onClick={handleClick}
    >
      {loading || spinning ? <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
      {label}
    </button>
  );
}

export function actionLock(pending: boolean, variables: unknown, rowId: string) {
  let current = "";
  if (typeof variables === "string" || typeof variables === "number") current = String(variables);
  else if (variables && typeof variables === "object" && "id" in variables) {
    current = String((variables as { id: unknown }).id);
  }
  return {
    disabled: pending,
    loading: pending && (current === "" || current === rowId),
  };
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

type SkeletonVariant = "table" | "cards" | "dashboard" | "portal" | "form" | "profile" | "rows" | "calendar" | "block";

function Bone({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-lg", className)} />;
}

function SkeletonStatus({ label }: { label: string }) {
  const { tr } = useI18n();
  return <span className="sr-only">{tr(label)}</span>;
}

function SkeletonFrame({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={className} role="status" aria-live="polite" aria-busy="true">
      <SkeletonStatus label={label} />
      {children}
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <SkeletonFrame label="Chargement des données…" className="overflow-hidden rounded-2xl border border-[var(--role-line)] bg-white">
      <div className="flex gap-4 border-b border-[var(--role-line)] bg-[#fafafa] px-4 py-3">
        {Array.from({ length: columns }, (_, index) => (
          <Bone key={index} className="h-3 flex-1" />
        ))}
      </div>
      <div>
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="flex items-center gap-4 border-t border-[var(--role-line)] px-4 py-3.5 first:border-t-0">
            {Array.from({ length: columns }, (_, column) => (
              <Bone
                key={column}
                className={cn("h-3.5 flex-1", column === 0 && "max-w-[46%]", column === columns - 1 && "max-w-16")}
              />
            ))}
          </div>
        ))}
      </div>
    </SkeletonFrame>
  );
}

export function CardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <SkeletonFrame label="Chargement des données…" className="grid gap-3 md:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-2xl border border-[var(--role-line)] bg-white p-4">
          <Bone className="h-4 w-2/3" />
          <Bone className="mt-3 h-3 w-1/3" />
          <Bone className="mt-4 h-8 w-20 rounded-full" />
        </div>
      ))}
    </SkeletonFrame>
  );
}

export function RowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <SkeletonFrame label="Chargement des données…" className="space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Bone className="h-9 w-9 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Bone className="h-3.5 w-2/5" />
            <Bone className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </SkeletonFrame>
  );
}

function DashboardSkeleton() {
  return (
    <SkeletonFrame label="Chargement des données…" className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-2xl border border-[var(--role-line)] bg-white p-4">
            <Bone className="h-3 w-24" />
            <Bone className="mt-3 h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-[var(--role-line)] bg-white p-4 lg:col-span-3">
          <Bone className="h-4 w-48" />
          <Bone className="mt-4 h-44 w-full" />
        </div>
        <div className="flex flex-col items-center rounded-2xl border border-[var(--role-line)] bg-white p-4 lg:col-span-2">
          <Bone className="h-4 w-36" />
          <Bone className="mt-6 h-36 w-36 rounded-full" />
        </div>
      </div>
    </SkeletonFrame>
  );
}

function PortalSkeleton() {
  return (
    <SkeletonFrame label="Chargement des données…" className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="rounded-2xl border border-[var(--role-line)] bg-white p-4">
            <Bone className="h-3 w-20" />
            <Bone className="mt-3 h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-[var(--role-line)] bg-white p-4">
        <Bone className="h-4 w-40" />
        <Bone className="mx-auto mt-4 h-36 w-36 rounded-full" />
      </div>
      <div className="rounded-2xl border border-[var(--role-line)] bg-white p-4">
        <Bone className="h-4 w-36" />
        <Bone className="mt-4 h-32 w-full" />
      </div>
    </SkeletonFrame>
  );
}

function FormSkeleton() {
  return (
    <SkeletonFrame label="Chargement des données…" className="space-y-4">
      {Array.from({ length: 2 }, (_, card) => (
        <div key={card} className="rounded-2xl border border-[var(--role-line)] bg-white p-5">
          <Bone className="h-5 w-32" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="space-y-2">
                <Bone className="h-3 w-20" />
                <Bone className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </SkeletonFrame>
  );
}

function ProfileSkeleton() {
  return (
    <SkeletonFrame label="Chargement des données…" className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Bone className="h-7 w-56" />
          <Bone className="h-3.5 w-72" />
        </div>
        <Bone className="h-7 w-20 rounded-full" />
      </div>
      <div className="flex items-center gap-4 rounded-2xl border border-[var(--role-line)] bg-white p-4">
        <Bone className="h-16 w-16 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Bone className="h-4 w-40" />
          <Bone className="h-3 w-56" />
        </div>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Bone key={index} className="h-9 w-24" />
        ))}
      </div>
      <TableSkeleton rows={4} />
    </SkeletonFrame>
  );
}

function CalendarSkeleton() {
  return (
    <SkeletonFrame label="Chargement des données…">
      <Bone className="mb-4 h-5 w-40" />
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }, (_, index) => (
          <Bone key={index} className="h-16 rounded-xl" />
        ))}
      </div>
    </SkeletonFrame>
  );
}

export function ShellSkeleton() {
  return (
    <SkeletonFrame label="Chargement de la session…" className="flex h-dvh bg-[#f4f4f5]">
      <div className="hidden w-64 shrink-0 flex-col gap-3 bg-[#1c1224] p-4 md:flex">
        <Bone className="h-8 w-28 bg-white/15" />
        {Array.from({ length: 8 }, (_, index) => (
          <Bone key={index} className="h-8 w-full bg-white/10" />
        ))}
      </div>
      <div className="min-w-0 flex-1 p-6">
        <Bone className="h-8 w-56" />
        <Bone className="mt-2 h-3.5 w-72" />
        <div className="mt-6">
          <TableSkeleton />
        </div>
      </div>
    </SkeletonFrame>
  );
}

export function Spinner({ variant = "table", rows }: { variant?: SkeletonVariant; rows?: number } = {}) {
  if (variant === "cards") return <CardsSkeleton />;
  if (variant === "dashboard") return <DashboardSkeleton />;
  if (variant === "portal") return <PortalSkeleton />;
  if (variant === "form") return <FormSkeleton />;
  if (variant === "profile") return <ProfileSkeleton />;
  if (variant === "rows") return <RowsSkeleton rows={rows} />;
  if (variant === "calendar") return <CalendarSkeleton />;
  if (variant === "block") {
    return (
      <SkeletonFrame label="Chargement des données…" className="h-full w-full">
        <Bone className="h-full min-h-24 w-full" />
      </SkeletonFrame>
    );
  }
  return <TableSkeleton rows={rows} />;
}

export function DataLoader({ variant = "table" }: { label?: string; variant?: SkeletonVariant }) {
  return <Spinner variant={variant} />;
}
