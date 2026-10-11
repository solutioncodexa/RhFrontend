import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";
import { apiFetchBlob } from "@/lib/api";
import { compressImage } from "@/lib/images";
import { useI18n } from "@/lib/i18n";

export function ImageWell({
  label,
  path,
  stamp,
  maxEdge,
  busy,
  onFile,
}: {
  label: string;
  path: string | null;
  stamp: number;
  maxEdge: number;
  busy?: boolean;
  onFile: (file: File) => void;
}) {
  const { tr } = useI18n();
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setSrc(null);
      return;
    }
    let cancelled = false;
    let url = "";
    apiFetchBlob(`${path}${path.includes("?") ? "&" : "?"}v=${stamp}`)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [path, stamp]);

  return (
    <label className="flex cursor-pointer items-center gap-3">
      <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[var(--role-line)] bg-[var(--role-soft)]">
        {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5 text-[var(--role-muted)]" />}
      </span>
      <span className="text-sm font-semibold text-[var(--role-ink)]">
        {busy ? tr("Envoi…") : tr(label)}
        <span className="mt-0.5 block text-xs font-medium text-[var(--role-muted)]">{tr("Image compressée avant envoi")}</span>
      </span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/*"
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          const picked = e.target.files?.[0];
          e.target.value = "";
          if (!picked) return;
          void compressImage(picked, maxEdge).then(onFile);
        }}
      />
    </label>
  );
}
