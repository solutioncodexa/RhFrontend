import type { FormEvent, ReactNode } from "react";
import { Search, X } from "lucide-react";
import { Button, Input } from "./ui";

export function FilterBar({
  query,
  onQueryChange,
  placeholder,
  onApply,
  onClear,
  canClear,
  children,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder: string;
  onApply: () => void;
  onClear: () => void;
  canClear: boolean;
  children?: ReactNode;
}) {
  function submit(e: FormEvent) {
    e.preventDefault();
    onApply();
  }

  return (
    <form onSubmit={submit} className="mb-4 rounded-2xl border border-indigo-100 bg-white p-3 card-shadow">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[16rem] flex-1">
          <span className="mb-1 block text-xs font-semibold text-indigo-900/70">Recherche</span>
          <Input value={query} placeholder={placeholder} onChange={(e) => onQueryChange(e.target.value)} className="bg-white" />
        </label>
        {children}
        <div className="flex gap-2">
          <Button type="submit">
            <Search className="h-4 w-4" />
            Rechercher
          </Button>
          {canClear ? (
            <Button type="button" variant="ghost" onClick={onClear}>
              <X className="h-4 w-4" />
              Effacer
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
