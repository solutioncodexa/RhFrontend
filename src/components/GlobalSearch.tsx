import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { apiFetch, toQuery } from "@/lib/api";
import { asRecord, fullName } from "@/lib/utils";
import { Input, Spinner } from "./ui";
import { useI18n } from "@/lib/i18n";

type Hit = Record<string, unknown> & { type?: string; href?: string };

export function GlobalSearch() {
  const { tr } = useI18n();
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = rootRef.current?.getBoundingClientRect();
      if (!r) return;
      setBox({ top: r.bottom + 6, left: r.left, width: r.width });
    };
    place();
    const onDoc = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (rootRef.current?.contains(target) || target.closest?.("[data-global-search]")) return;
      setOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("mousedown", onDoc);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const next = draft.trim();
    setQ(next);
    setOpen(next.length >= 2);
  }

  const search = useQuery({
    queryKey: ["search", q],
    enabled: q.length >= 2,
    queryFn: async () => {
      const raw = await apiFetch<unknown>(`/search${toQuery({ q })}`);
      if (Array.isArray(raw)) return raw as Hit[];
      const o = asRecord(raw);
      if (Array.isArray(o.results)) return o.results as Hit[];
      if (Array.isArray(o.content)) return o.content as Hit[];
      return Object.entries(o).flatMap(([type, list]) =>
        Array.isArray(list)
          ? (list as Record<string, unknown>[]).map((item) => ({ ...item, type }))
          : [],
      );
    },
  });

  return (
    <div ref={rootRef} className="relative w-full max-w-md">
      <form onSubmit={submit} className="relative">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => q.length >= 2 && setOpen(true)}
          placeholder={tr("Recherche globale")}
          className="bg-white/90 pe-10"
        />
        <button
          type="submit"
          aria-label="Rechercher"
          className="absolute end-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-indigo-500 hover:bg-indigo-50"
        >
          <Search className="h-4 w-4" />
        </button>
      </form>
      {open && q.length >= 2
        ? createPortal(
        <div
          data-global-search
          className="fixed z-[90] overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-xl"
          style={{ top: box.top, left: box.left, width: box.width }}
        >
          {search.isLoading ? <div className="px-3 py-3"><Spinner variant="rows" rows={3} /></div> : null}
          {search.data?.length === 0 ? (
            <p className="px-3 py-3 text-sm text-indigo-500">{tr("Aucun résultat")}</p>
          ) : null}
          <ul className="max-h-72 overflow-y-auto py-1">
            {(search.data ?? []).slice(0, 12).map((hit, i) => {
              const type = String(hit.type ?? hit.entityType ?? "item");
              const path =
                String(hit.href ?? "") ||
                (type.toLowerCase().includes("employee")
                  ? `/app/employees`
                  : type.toLowerCase().includes("contract")
                    ? `/app/contracts`
                    : type.toLowerCase().includes("document")
                      ? `/app/documents`
                      : `/app`);
              return (
                <li key={idKey(hit, i)}>
                  <Link
                    to={path}
                    onClick={() => setOpen(false)}
                    className="block px-3 py-2 text-sm hover:bg-indigo-50"
                  >
                    <span className="font-semibold text-indigo-950">{fullName(hit)}</span>
                    <span className="ms-2 text-xs uppercase text-indigo-400">{type}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

function idKey(hit: Hit, i: number) {
  return String(hit.id ?? i);
}
