import { Search } from "lucide-react";
import type { FormEvent } from "react";
import { Button, Input } from "./ui";

export function SearchBox({
  value,
  onChange,
  onSearch,
  placeholder = "Rechercher…",
}: {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
}) {
  function submit(e: FormEvent) {
    e.preventDefault();
    onSearch();
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-md gap-2">
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white"
      />
      <Button type="submit" variant="outline" aria-label="Rechercher">
        <Search className="h-4 w-4" />
        Rechercher
      </Button>
    </form>
  );
}
