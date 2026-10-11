import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export type SearchOption = { value: string; label: string; hint?: string };

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Choisir…",
  searchPlaceholder = "Rechercher…",
  emptyLabel = "Aucun",
  required,
  className,
  invalid,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  required?: boolean;
  className?: string;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const { tr } = useI18n();
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [box, setBox] = useState({ top: 0, left: 0, width: 0 });

  const selected = options.find((o) => o.value === value || (o.value !== "" && value !== "" && Number(o.value) === Number(value) && !Number.isNaN(Number(value))));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.label} ${tr(o.label)} ${o.hint ?? ""}`.toLowerCase().includes(q));
  }, [options, query, tr]);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const el = rootRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const width = Math.max(r.width, 260);
      const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
      const menuHeight = Math.min(320, window.innerHeight - 16);
      let top = r.bottom + 6;
      if (top + menuHeight > window.innerHeight - 8) {
        const above = r.top - 6 - menuHeight;
        top = above >= 8 ? above : 8;
      }
      if (top + menuHeight > window.innerHeight - 8) top = Math.max(8, window.innerHeight - 8 - menuHeight);
      setBox((prev) => (prev.top === top && prev.left === left && prev.width === width ? prev : { top, left, width }));
    };
    let frame = 0;
    const loop = () => {
      place();
      frame = requestAnimationFrame(loop);
    };
    loop();
    searchRef.current?.focus();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if ((t as HTMLElement).closest?.(`[data-search-select="${id}"]`)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open, id]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {required ? <input tabIndex={-1} className="sr-only" value={value} required onChange={() => undefined} /> : null}
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setQuery("");
          setOpen((v) => !v);
        }}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 text-start text-sm outline-none transition duration-200",
          disabled && "cursor-default bg-indigo-50 text-indigo-950",
          invalid
            ? "border-rose-400 ring-4 ring-rose-200/80"
            : "border-indigo-100 ring-indigo-400/40 hover:border-indigo-300 focus:border-indigo-400 focus:ring-4",
          disabled && "hover:border-indigo-100",
        )}
      >
        <span className={cn("truncate", selected ? "text-indigo-950" : "text-indigo-300")}>
          {selected ? tr(selected.label) : tr(placeholder)}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-indigo-400" />
      </button>
      {open
        ? createPortal(
        <div
          data-search-select={id}
          className="fixed z-[90] overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-xl"
          style={{ top: box.top, left: box.left, width: box.width }}
        >
          <div className="border-b border-indigo-50 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-300" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tr(searchPlaceholder)}
                className="h-9 w-full rounded-lg border border-indigo-100 bg-indigo-50/40 ps-8 pe-3 text-sm outline-none focus:border-indigo-400 focus:bg-white"
              />
            </div>
          </div>
          <ul role="listbox" className="max-h-60 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                className="flex w-full items-center px-3 py-2 text-start text-sm text-indigo-400 hover:bg-indigo-50"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                {tr(emptyLabel)}
              </button>
            </li>
            {filtered.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  className="flex w-full items-center gap-2 px-3 py-2 text-start hover:bg-indigo-50"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("h-4 w-4 shrink-0", o.value === value ? "text-indigo-600" : "text-transparent")} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-indigo-950">{tr(o.label)}</span>
                    {o.hint ? <span className="block truncate text-xs text-indigo-400">{o.hint}</span> : null}
                  </span>
                </button>
              </li>
            ))}
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-indigo-400">{tr("Aucun résultat")}</li>
            ) : null}
          </ul>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
