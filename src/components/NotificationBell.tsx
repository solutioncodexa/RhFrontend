import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { apiFetch, listResource } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Spinner } from "./ui";

type Note = {
  id?: string | number;
  title?: string;
  message?: string;
  link?: string | null;
  read?: boolean;
  createdAt?: string;
};

function relativeTime(iso: string | undefined, lang: "ar" | "fr") {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (!Number.isFinite(m) || m < 1) return lang === "ar" ? "الآن" : "à l'instant";
  if (m < 60) return lang === "ar" ? `منذ ${m} د` : `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return lang === "ar" ? `منذ ${h} س` : `il y a ${h} h`;
  const d = Math.round(h / 24);
  return lang === "ar" ? `منذ ${d} ي` : `il y a ${d} j`;
}

function destination(note: Note, mode: "app" | "portal") {
  const raw = String(note.link ?? "").trim();
  if (raw.startsWith("/")) {
    if (mode === "portal" && raw.startsWith("/app/")) {
      const tail = raw.slice(4);
      if (tail.startsWith("/leave")) return "/portal/leave";
      if (tail.startsWith("/requests") || tail.startsWith("/employee-requests")) return "/portal/requests";
      if (tail.startsWith("/documents")) return "/portal/documents";
      if (tail.startsWith("/announcements")) return "/portal/announcements";
      if (tail.startsWith("/expenses")) return "/portal/expenses";
      if (tail.startsWith("/trips")) return "/portal/trips";
      if (tail.startsWith("/onboarding")) return "/portal/onboarding";
      if (tail.startsWith("/offboarding")) return "/portal/offboarding";
      if (tail.startsWith("/reviews")) return "/portal/reviews";
      if (tail.startsWith("/objectives")) return "/portal/objectives";
      return "/portal";
    }
    if (mode === "app" && raw.startsWith("/portal/")) {
      const tail = raw.slice(7);
      if (tail.startsWith("/leave")) return "/app/leave-requests";
      if (tail.startsWith("/requests")) return "/app/requests";
      if (tail.startsWith("/documents")) return "/app/documents";
      if (tail.startsWith("/announcements")) return "/app/announcements";
      if (tail.startsWith("/expenses")) return "/app/expenses";
      if (tail.startsWith("/trips")) return "/app/trips";
      if (tail.startsWith("/onboarding")) return "/app/onboarding";
      if (tail.startsWith("/offboarding")) return "/app/offboarding";
      if (tail.startsWith("/reviews")) return "/app/reviews";
      if (tail.startsWith("/objectives")) return "/app/objectives";
      if (tail.startsWith("/jobs") || tail.startsWith("/job-offers")) return "/app/jobs";
      if (tail.startsWith("/candidates")) return "/app/candidates";
      return "/app";
    }
    return raw;
  }
  const text = `${note.title ?? ""} ${note.message ?? ""}`.toLowerCase();
  if (text.includes("congé") || text.includes("عط")) return mode === "portal" ? "/portal/leave" : "/app/leave-requests";
  if (text.includes("document") || text.includes("وث")) return mode === "portal" ? "/portal/documents" : "/app/documents";
  if (text.includes("annonce") || text.includes("إعلان")) return mode === "portal" ? "/portal/announcements" : "/app/announcements";
  if (text.includes("frais") || text.includes("مصار")) return mode === "portal" ? "/portal/expenses" : "/app/expenses";
  if (text.includes("déplacement") || text.includes("deplacement")) return mode === "portal" ? "/portal/trips" : "/app/trips";
  if (text.includes("candidat")) return "/app/candidates";
  if (text.includes("entretien")) return mode === "portal" ? "/portal/reviews" : "/app/reviews";
  if (text.includes("objectif")) return mode === "portal" ? "/portal/objectives" : "/app/objectives";
  if (text.includes("intégration") || text.includes("integration")) return mode === "portal" ? "/portal/onboarding" : "/app/onboarding";
  if ((text.includes("départ") || text.includes("depart")) && (text.includes("parcours") || text.includes("tâche") || text.includes("tache"))) {
    return mode === "portal" ? "/portal/offboarding" : "/app/offboarding";
  }
  if (text.includes("demande") || text.includes("طلب")) return mode === "portal" ? "/portal/requests" : "/app/requests";
  return "";
}

export function NotificationBell({ mode }: { mode: "app" | "portal" }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const userKey = String(user?.id ?? "");
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = useQuery({
    queryKey: ["notifications-unread", userKey],
    queryFn: () => listResource<Note>("/notifications", { page: 0, size: 1, unread: true }),
    enabled: Boolean(userKey),
    refetchInterval: 20000,
  });
  const list = useQuery({
    queryKey: ["notifications-menu", userKey],
    queryFn: () => listResource<Note>("/notifications", { page: 0, size: 12 }),
    enabled: open && Boolean(userKey),
  });

  const count = unread.data?.totalElements ?? 0;

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(352, window.innerWidth - 16);
      const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
      setBox({ top: rect.bottom + 8, left });
    };
    place();
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["notifications-unread", userKey] });
    qc.invalidateQueries({ queryKey: ["notifications-menu", userKey] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  const markOne = useMutation({
    mutationFn: (id: string) => apiFetch(`/notifications/${id}/read`, { method: "POST", body: "{}" }),
    onSuccess: refresh,
  });
  const markAll = useMutation({
    mutationFn: () => apiFetch("/notifications/read-all", { method: "POST", body: "{}" }),
    onSuccess: refresh,
  });

  const items = list.data?.content ?? [];

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={t("notifications")}
        aria-expanded={open}
        className="relative rounded-lg p-2 text-indigo-800 hover:bg-indigo-50"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="h-5 w-5" />
        {count > 0 ? (
          <span className="absolute end-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-[90] w-[min(22rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-2xl"
              style={{ top: box.top, left: box.left }}
            >
              <div className="flex items-center justify-between gap-2 border-b border-indigo-50 px-4 py-3">
                <p className="text-sm font-semibold text-indigo-950">{t("notifications")}</p>
                {count > 0 ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={markAll.isPending}
                    onClick={() => {
                      if (!markAll.isPending) void markAll.mutateAsync();
                    }}
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    {lang === "ar" ? "تعليم الكل كمقروء" : "Tout marquer lu"}
                  </button>
                ) : null}
              </div>
              <ul className="max-h-80 overflow-y-auto">
                {list.isLoading ? (
                  <li className="px-4 py-3"><Spinner variant="rows" rows={3} /></li>
                ) : items.length === 0 ? (
                  <li className="px-4 py-8 text-center text-sm text-indigo-400">
                    {lang === "ar" ? "لا توجد إشعارات" : "Aucune notification"}
                  </li>
                ) : (
                  items.map((note) => {
                    const id = String(note.id ?? "");
                    const unreadItem = note.read !== true;
                    const to = destination(note, mode);
                    return (
                      <li key={id} className="border-b border-indigo-50 last:border-0">
                        <button
                          type="button"
                          className="w-full text-start"
                          disabled={markOne.isPending}
                          onClick={() => {
                            if (markOne.isPending) return;
                            if (unreadItem && id) void markOne.mutateAsync(id);
                            setOpen(false);
                            if (to) navigate(to);
                          }}
                        >
                          <div className="flex gap-3 px-4 py-3 hover:bg-indigo-50/70">
                            <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", unreadItem ? "bg-violet-600" : "bg-indigo-100")} />
                            <div className="min-w-0 flex-1">
                              <p className={cn("text-sm text-indigo-950", unreadItem && "font-semibold")}>{note.title}</p>
                              {note.message ? <p className="mt-0.5 line-clamp-2 text-xs text-indigo-500">{note.message}</p> : null}
                              <p className="mt-1 text-[10px] text-indigo-300">{relativeTime(note.createdAt, lang)}</p>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
