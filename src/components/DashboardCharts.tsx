import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

export type Slice = { label: string; value: number };

const MIX = ["#4f46e5", "#d97706", "#e11d48", "#7c3aed", "#0891b2", "#059669", "#6366f1", "#a78bfa"];

export function palette(index: number) {
  return MIX[index % MIX.length];
}

export function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !Number.isFinite(target)) {
      setValue(target);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setValue(target * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

export function PresenceRing({ rate }: { rate: number }) {
  const r = 36;
  const length = 2 * Math.PI * r;
  const safe = Math.max(0, Math.min(100, rate));
  const offset = length - (safe / 100) * length;
  const shown = useCountUp(safe);
  return (
    <svg viewBox="0 0 96 96" className="h-24 w-24 shrink-0" role="img" aria-label={`Présence ${safe}%`}>
      <circle cx="48" cy="48" r={r} fill="none" stroke="rgb(255 255 255 / 0.18)" strokeWidth="8" />
      <circle
        cx="48"
        cy="48"
        r={r}
        fill="none"
        stroke="white"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={length}
        strokeDashoffset={offset}
        transform="rotate(-90 48 48)"
        className="dash-ring"
        style={{ ["--ring-length" as string]: `${length}px` }}
      />
      <text x="48" y="52" textAnchor="middle" fill="white" fontSize="16" fontWeight="700">
        {shown.toFixed(0)}%
      </text>
    </svg>
  );
}

export function DonutChart({ slices, center }: { slices: Slice[]; center?: string }) {
  const { tr } = useI18n();
  const data = slices.filter((s) => s.value > 0);
  const total = data.reduce((sum, s) => sum + s.value, 0);
  const r = 52;
  const length = 2 * Math.PI * r;
  let cursor = 0;
  if (total <= 0) {
    return <p className="text-sm text-indigo-400">{tr("Pas encore de données pour cette période.")}</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg viewBox="0 0 140 140" className="dash-donut h-40 w-40" role="img" aria-label="Répartition">
        {data.map((s, i) => {
          const arc = (s.value / total) * length;
          const node = (
            <circle
              key={s.label}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={palette(i)}
              strokeWidth="16"
              strokeDasharray={`${arc} ${length - arc}`}
              strokeDashoffset={-cursor}
              transform="rotate(-90 70 70)"
            >
              <title>{`${s.label} : ${formatTick(s.value)}`}</title>
            </circle>
          );
          cursor += arc;
          return node;
        })}
        <text x="70" y="74" textAnchor="middle" className="fill-indigo-950" fontSize="16" fontWeight="700">
          {center ?? formatTick(total)}
        </text>
      </svg>
      <ul className="min-w-40 space-y-2 text-sm">
        {data.map((s, i) => (
          <li key={s.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-indigo-900">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: palette(i) }} />
              {tr(s.label)}
            </span>
            <span className="font-semibold text-indigo-950">{formatTick(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrendChart({
  points,
}: {
  points: { label: string; present: number; late: number; absent: number; leave: number }[];
}) {
  const { tr } = useI18n();
  if (points.length === 0) {
    return <p className="text-sm text-indigo-400">{tr("Aucune présence sur les 14 derniers jours.")}</p>;
  }
  const width = 640;
  const height = 210;
  const padX = 8;
  const base = 176;
  const slot = (width - padX * 2) / points.length;
  const max = Math.max(1, ...points.map((p) => p.present + p.late + p.absent + p.leave));
  const series = [
    { key: "present" as const, color: "#4f46e5" },
    { key: "late" as const, color: "#d97706" },
    { key: "absent" as const, color: "#e11d48" },
    { key: "leave" as const, color: "#7c3aed" },
  ];
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" role="img" aria-label="Présences sur 14 jours">
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1="0" x2={width} y1={base - base * g * 0.82} y2={base - base * g * 0.82} stroke="#e0e7ff" strokeDasharray="4 6" />
        ))}
        {points.map((point, i) => {
          const x = padX + i * slot + slot * 0.22;
          const barW = slot * 0.56;
          let y = base;
          return series.map((serie, si) => {
            const value = point[serie.key];
            const h = (value / max) * 150;
            y -= h;
            return (
              <rect
                key={serie.key}
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, value > 0 ? 2 : 0)}
                rx="3"
                fill={serie.color}
                className="dash-bar"
                style={{ animationDelay: `${i * 30 + si * 20}ms` }}
              >
                <title>{`${point.label} · ${labelOf(serie.key)} : ${value}`}</title>
              </rect>
            );
          });
        })}
        {points.map((point, i) => (
          <text key={point.label} x={padX + i * slot + slot / 2} y="200" textAnchor="middle" fontSize="11" fill="#6366f1">
            {i % 2 === 0 ? point.label : ""}
          </text>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-indigo-800">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {tr(labelOf(s.key))}
          </span>
        ))}
      </div>
    </div>
  );
}

export function BarList({ slices, money = false }: { slices: Slice[]; money?: boolean }) {
  const { tr } = useI18n();
  const data = slices.filter((s) => s.label);
  const max = Math.max(1, ...data.map((s) => s.value));
  if (data.length === 0) {
    return <p className="text-sm text-indigo-400">{tr("Rien à répartir pour le moment.")}</p>;
  }
  return (
    <ul className="space-y-3">
      {data.map((s, i) => (
        <li key={s.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-indigo-900">{tr(s.label)}</span>
            <span className="font-semibold text-indigo-950">{money ? formatMad(s.value) : formatTick(s.value)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-indigo-50">
            <div
              className="dash-grow h-full rounded-full"
              style={{ width: `${(s.value / max) * 100}%`, background: palette(i), animationDelay: `${i * 70}ms` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function labelOf(key: "present" | "late" | "absent" | "leave") {
  if (key === "present") return "Présents";
  if (key === "late") return "Retards";
  if (key === "absent") return "Absents";
  return "Congés";
}

function formatTick(value: number) {
  return Number.isInteger(value) ? String(value) : value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

function formatMad(value: number) {
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " MAD";
}
