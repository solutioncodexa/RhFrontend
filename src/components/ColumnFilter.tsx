import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export function ColumnFilter({
  label,
  active,
  onOpen,
  onSearch,
  onReset,
  children,
}: {
  label: string;
  active?: boolean;
  onOpen?: () => void;
  onSearch: () => void;
  onReset: () => void;
  children: ReactNode;
}) {
  const { tr } = useI18n();
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const onOther = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) setOpen(false);
    };
    window.addEventListener("rhflow-column-filter", onOther);
    return () => window.removeEventListener("rhflow-column-filter", onOther);
  }, [id]);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 280;
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
      const panelHeight = Math.min(240, window.innerHeight - 16);
      let top = rect.bottom + 8;
      if (top + panelHeight > window.innerHeight - 8) {
        const above = rect.top - 8 - panelHeight;
        top = above >= 8 ? above : 8;
      }
      setBox((prev) => (prev.top === top && prev.left === left ? prev : { top, left }));
    };
    let frame = 0;
    const loop = () => {
      place();
      frame = requestAnimationFrame(loop);
    };
    loop();
    const onDoc = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      if (target.closest?.("[data-search-select]")) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    const next = !open;
    if (next) {
      onOpen?.();
      window.dispatchEvent(new CustomEvent("rhflow-column-filter", { detail: id }));
    }
    setOpen(next);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Filtrer ${label}`}
        aria-expanded={open}
        onClick={toggle}
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-white",
          active ? "text-teal-600" : "text-indigo-300 hover:text-indigo-600",
        )}
      >
        <Search className="h-3.5 w-3.5" />
      </button>
      {open ? createPortal(
        <div
          ref={panelRef}
          className="fixed z-[90] w-[280px] rounded-xl border border-slate-200 bg-white p-3 normal-case tracking-normal shadow-xl"
          style={{ top: box.top, left: box.left }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSearch();
              setOpen(false);
            }}
          >
            <div className="text-sm text-slate-700">{children}</div>
            <div className="mt-3 flex gap-2">
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-500"
              >
                <Search className="h-4 w-4" />
                {tr("Rechercher")}
              </button>
              <button
                type="button"
                className="h-9 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                onClick={() => {
                  onReset();
                  setOpen(false);
                }}
              >
                {tr("Réinitialiser")}
              </button>
            </div>
          </form>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
