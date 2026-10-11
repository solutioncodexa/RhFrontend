import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Loader2,
  Maximize2,
  Menu,
  Minimize2,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { apiFetch } from "@/lib/api";
import { Button, Card, Input } from "./ui";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { normalizeRole, type Role } from "@/lib/types";

type ChatResponse = {
  reply?: string;
  replyAr?: string | null;
  actionType?: string;
  actionId?: string | null;
  requiresConfirmation?: boolean;
  draft?: Record<string, unknown>;
  sessionId?: string;
  ollamaAvailable?: boolean;
  intake?: Intake | null;
};

type Intake = {
  flow: string;
  step: string;
  draft: Record<string, unknown>;
};

type ConfirmResponse = {
  success?: boolean;
  message?: string;
  result?: Record<string, unknown>;
};

type Health = {
  enabled?: boolean;
  ollamaAvailable?: boolean;
  includedInPlan?: boolean;
  message?: string;
  model?: string;
  role?: string;
  roleLabel?: string;
  suggestions?: string[];
};

type Msg = {
  role: "user" | "assistant";
  text: string;
  confirmation?: { actionId: string; actionType: string; draft?: Record<string, unknown> };
  resultLinks?: { label: string; to: string }[];
  intake?: Intake;
};

type Conversation = {
  id: string;
  title: string;
  updatedAt: number;
  messages: Msg[];
};

const SUGGESTIONS: Record<Role, string[]> = {
  EMPLOYEE: [
    "Que peux-tu faire ?",
    "Combien de jours de congé me restent-ils ?",
    "Suis-je présent aujourd'hui ?",
    "Explique mon bulletin",
    "Pose un congé",
  ],
  MANAGER: [
    "Que peux-tu faire ?",
    "Absents aujourd'hui",
    "Congés en attente",
    "Cherche un employé",
    "Pose un congé",
  ],
  ADMIN: [
    "Que peux-tu faire ?",
    "Cherche un employé",
    "Absents aujourd'hui",
    "Explique le dernier bulletin",
    "Créer un employé",
    "Pose un congé",
  ],
  SUPER_ADMIN: ["Que peux-tu faire ?", "Combien de sociétés ?", "Quels plans sont actifs ?"],
};

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrateur",
  MANAGER: "Manager",
  EMPLOYEE: "Employé",
  SUPER_ADMIN: "Super administrateur",
};

const DRAFT_LABELS: Record<string, string> = {
  firstName: "Prénom",
  lastName: "Nom",
  email: "E-mail",
  cin: "CIN",
  phone: "Téléphone",
  city: "Ville",
  contractType: "Contrat",
  startDate: "Début",
  endDate: "Fin",
  baseSalary: "Salaire MAD",
  weeklyHours: "Heures / semaine",
  employeeName: "Employé",
  leaveTypeName: "Type de congé",
  comment: "Motif",
  q: "Recherche",
};

const HIDDEN_DRAFT_KEYS = new Set(["employeeId", "leaveTypeId"]);

function storageKey(userId?: string | number) {
  return `rhflow.assistant.conversations.${userId ?? "anon"}`;
}

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function readConversations(userId?: string | number): Conversation[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c) => c && typeof c.id === "string" && Array.isArray(c.messages))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function writeConversations(userId: string | number | undefined, list: Conversation[]) {
  localStorage.setItem(storageKey(userId), JSON.stringify(list.slice(0, 50)));
}

function titleFromMessages(messages: Msg[]) {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser?.text.trim()) return "Nouvelle conversation";
  const t = firstUser.text.trim().replace(/\s+/g, " ");
  return t.length > 56 ? `${t.slice(0, 56)}…` : t;
}

function formatRelative(ts: number) {
  const mins = Math.floor((Date.now() - ts) / 60_000);
  const hours = Math.floor((Date.now() - ts) / 3_600_000);
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (mins < 1) return "À l’instant";
  if (mins < 60) return `Il y a ${mins} min`;
  if (hours < 24) return `Il y a ${hours} h`;
  if (days < 7) return `Il y a ${days} j`;
  return new Date(ts).toLocaleDateString("fr-FR");
}

function actionLabel(type: string) {
  if (type === "CREATE_EMPLOYEE") return "Créer l’employé";
  if (type === "CREATE_LEAVE") return "Poser le congé";
  return "Confirmer";
}

type AssistantCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  sessionEpoch: number;
  openFreshChat: () => void;
  startFreshSession: () => void;
};

const Ctx = createContext<AssistantCtx | null>(null);

export function useAssistantChat() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAssistantChat must be used within AssistantProvider");
  return ctx;
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const startFreshSession = useCallback(() => setSessionEpoch((n) => n + 1), []);
  const openFreshChat = useCallback(() => {
    startFreshSession();
    setOpen(true);
  }, [startFreshSession]);
  return (
    <Ctx.Provider value={{ open, setOpen, sessionEpoch, openFreshChat, startFreshSession }}>
      {children}
      <AssistantDrawer />
    </Ctx.Provider>
  );
}

function useChatSession() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const ctx = useContext(Ctx);
  const sessionEpoch = ctx?.sessionEpoch ?? 0;
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<string | null>(null);
  const messagesRef = useRef<Msg[]>([]);
  const hydrated = useRef(false);
  const lastEpoch = useRef(sessionEpoch);

  const health = useQuery({
    queryKey: ["assistant-health", user?.id, role],
    queryFn: () => apiFetch<Health>("/assistant/health"),
  });

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    setConversations(readConversations(user?.id));
    setMessages([]);
    setQuestion("");
    setActiveId(null);
    activeIdRef.current = null;
    hydrated.current = true;
    lastEpoch.current = sessionEpoch;
  }, [user?.id]);

  useEffect(() => {
    if (!hydrated.current) return;
    if (lastEpoch.current === sessionEpoch) return;
    lastEpoch.current = sessionEpoch;
    setMessages([]);
    setQuestion("");
    setActiveId(null);
    activeIdRef.current = null;
    setHistoryOpen(false);
    setSessionId(crypto.randomUUID());
  }, [sessionEpoch]);

  useEffect(() => {
    if (!hydrated.current || messages.length === 0) return;
    const id = activeIdRef.current ?? newId();
    if (!activeIdRef.current) {
      activeIdRef.current = id;
      setActiveId(id);
    }
    setConversations((prev) => {
      const next: Conversation = {
        id,
        title: titleFromMessages(messages),
        updatedAt: Date.now(),
        messages,
      };
      const list = [next, ...prev.filter((c) => c.id !== id)].sort((a, b) => b.updatedAt - a.updatedAt);
      writeConversations(user?.id, list);
      return list;
    });
  }, [messages, user?.id]);

  const chat = useMutation({
    mutationFn: (message: string) => {
      const previous = messagesRef.current.at(-1);
      const intake = previous?.role === "assistant" ? previous.intake : undefined;
      return apiFetch<ChatResponse>("/assistant/chat", {
        method: "POST",
        body: JSON.stringify({
          message,
          sessionId,
          locale: lang,
          intake,
          history: messagesRef.current.slice(-8).map((m) => ({ role: m.role, content: m.text })),
        }),
      });
    },
    onSuccess: (data, message) => {
      if (data.sessionId) setSessionId(data.sessionId);
      const text = lang === "ar" && data.replyAr ? data.replyAr : data.reply || "";
      setMessages((m) => [
        ...m,
        { role: "user", text: message },
        {
          role: "assistant",
          text,
          confirmation:
            data.requiresConfirmation && data.actionId
              ? { actionId: data.actionId, actionType: data.actionType || "", draft: data.draft }
              : undefined,
          intake: data.intake ?? undefined,
        },
      ]);
      setQuestion("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const confirm = useMutation({
    mutationFn: (actionId: string) =>
      apiFetch<ConfirmResponse>("/assistant/confirm", {
        method: "POST",
        body: JSON.stringify({ actionId, sessionId, locale: lang }),
      }),
    onSuccess: (data, actionId) => {
      toast.success(data.message || "Action confirmée");
      const result = data.result ?? {};
      const links: { label: string; to: string }[] = [];
      if (result.id != null && (result.firstName != null || result.lastName != null || result.email != null)) {
        links.push({ label: `Ouvrir la fiche #${result.id}`, to: `/app/employees/${result.id}` });
      }
      if (result.id != null && result.startDate != null) {
        links.push({ label: "Voir les congés", to: `/app/leave-requests?employeeId=${result.employeeId ?? ""}` });
      }
      const done = data.message || "Création effectuée.";
      setMessages((prev) =>
        prev
          .map((m) => (m.confirmation?.actionId === actionId ? { ...m, confirmation: undefined } : m))
          .concat({ role: "assistant", text: done, resultLinks: links }),
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chat.isPending, confirm.isPending]);

  const submit = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || chat.isPending || confirm.isPending) return;
    chat.mutate(trimmed);
  };

  const cancelConfirm = (actionId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.confirmation?.actionId === actionId
          ? { ...m, confirmation: undefined, text: `${m.text}\n\n(Confirmation annulée)` }
          : m,
      ),
    );
  };

  const startNewChat = useCallback(() => {
    setMessages([]);
    setQuestion("");
    setActiveId(null);
    activeIdRef.current = null;
    setHistoryOpen(false);
    setSessionId(crypto.randomUUID());
  }, []);

  const selectConversation = useCallback(
    (id: string) => {
      const list = readConversations(user?.id);
      const found = list.find((c) => c.id === id);
      if (!found) return;
      setConversations(list);
      setActiveId(found.id);
      activeIdRef.current = found.id;
      setMessages(found.messages);
      setQuestion("");
      setHistoryOpen(false);
      setSessionId(crypto.randomUUID());
    },
    [user?.id],
  );

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const list = prev.filter((c) => c.id !== id);
        writeConversations(user?.id, list);
        return list;
      });
      if (activeIdRef.current === id) {
        setMessages([]);
        setActiveId(null);
        activeIdRef.current = null;
      }
    },
    [user?.id],
  );

  const suggestions = health.data?.suggestions?.length ? health.data.suggestions : SUGGESTIONS[role];
  const history = useMemo(() => conversations.filter((c) => c.messages.length > 0), [conversations]);
  const busy = chat.isPending || confirm.isPending;

  return {
    lang,
    role,
    question,
    setQuestion,
    messages,
    busy,
    submit,
    confirm,
    cancelConfirm,
    suggestions,
    bottomRef,
    health: health.data,
    historyOpen,
    setHistoryOpen,
    history,
    activeId,
    startNewChat,
    selectConversation,
    deleteConversation,
  };
}

function ChatShell({
  chat,
  expanded,
  onToggleExpand,
  onClose,
}: {
  chat: ReturnType<typeof useChatSession>;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onClose?: () => void;
}) {
  const roleLabel = chat.health?.roleLabel || ROLE_LABEL[chat.role];
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-2 border-b border-indigo-100 bg-white/90 px-3 py-2.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-full p-0"
          aria-label="Historique"
          onClick={() => chat.setHistoryOpen(true)}
        >
          <Menu className="h-4 w-4" />
        </Button>
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-200 to-indigo-100 text-violet-700">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-indigo-950">Assistant · {roleLabel}</p>
          <p className="truncate text-[10px] text-indigo-400">
            {chat.health?.ollamaAvailable ? "Ollama prêt" : "Mode guidé"} · rien n’est créé sans confirmation
          </p>
        </div>
        {onToggleExpand ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 rounded-full p-0"
            onClick={onToggleExpand}
            aria-label={expanded ? "Réduire" : "Agrandir"}
          >
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        ) : null}
        {onClose ? (
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,rgb(237_233_254),transparent_55%),linear-gradient(to_bottom,rgb(245_243_255),white)] px-3 py-3">
        <div className="mx-auto w-full max-w-3xl space-y-3">
          {chat.messages.length === 0 && !chat.busy ? (
            <WelcomeBlock
              title="Bienvenue dans l’assistant RH"
              subtitle={chat.health?.message || "Questions RH, soldes, présences — et actions après confirmation."}
              suggestions={chat.suggestions}
              onPick={chat.submit}
              disabled={chat.busy}
            />
          ) : (
            chat.messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
                  m.role === "user"
                    ? "ms-8 bg-indigo-600 text-white"
                    : "me-6 border border-indigo-50 bg-white/95 text-indigo-950",
                )}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                {m.confirmation ? (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950">
                    <p className="text-[11px] font-semibold uppercase tracking-wide">Vérification avant enregistrement</p>
                    <p className="mt-1 text-xs font-medium">{actionLabel(m.confirmation.actionType)}</p>
                    <ul className="mt-2 space-y-1">
                      {Object.entries(m.confirmation.draft ?? {})
                        .filter(([k, v]) => !HIDDEN_DRAFT_KEYS.has(k) && v != null && String(v).trim() !== "")
                        .map(([k, v]) => (
                          <li key={k} className="flex gap-2 text-xs">
                            <span className="shrink-0 font-medium text-amber-800/70">{DRAFT_LABELS[k] ?? k}</span>
                            <span className="min-w-0 break-all">{String(v)}</span>
                          </li>
                        ))}
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        loading={chat.confirm.isPending}
                        disabled={chat.confirm.isPending}
                        onClick={() => chat.confirm.mutateAsync(m.confirmation!.actionId)}
                      >
                        Confirmer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={chat.confirm.isPending}
                        onClick={() => chat.cancelConfirm(m.confirmation!.actionId)}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : null}
                {m.resultLinks?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.resultLinks.map((l) => (
                      <Link key={l.to} to={l.to}>
                        <Button size="sm" variant="outline">
                          {l.label}
                        </Button>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
          {chat.busy ? (
            <div className="me-6 flex items-center gap-2 rounded-2xl border border-indigo-50 bg-white px-3.5 py-2.5 text-sm text-indigo-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Réflexion…
            </div>
          ) : null}
          <div ref={chat.bottomRef} />
        </div>
      </div>

      <form
        className="flex items-end gap-2 border-t border-indigo-100 bg-white/95 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          chat.submit(chat.question);
        }}
      >
        <Input
          value={chat.question}
          onChange={(e) => chat.setQuestion(e.target.value)}
          placeholder="Ex. Ajoute un employé Sara Bennani sara@societe.ma"
          disabled={chat.busy}
          className="h-11 rounded-full px-4"
        />
        <Button
          type="submit"
          className="h-11 w-11 shrink-0 rounded-full p-0"
          disabled={chat.busy || !chat.question.trim()}
          aria-label="Envoyer"
        >
          {chat.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>

      <HistoryPanel
        open={chat.historyOpen}
        onClose={() => chat.setHistoryOpen(false)}
        history={chat.history}
        activeId={chat.activeId}
        onNew={chat.startNewChat}
        onSelect={chat.selectConversation}
        onDelete={chat.deleteConversation}
      />
    </div>
  );
}

function WelcomeBlock({
  title,
  subtitle,
  suggestions,
  onPick,
  disabled,
}: {
  title: string;
  subtitle: string;
  suggestions: string[];
  onPick: (s: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <div className="grid h-[4.5rem] w-[4.5rem] place-items-center rounded-2xl bg-gradient-to-br from-violet-200 to-indigo-100 text-violet-700 shadow-sm">
        <Sparkles className="h-8 w-8" />
      </div>
      <div className="max-w-md space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-indigo-950">{title}</h2>
        <p className="text-sm leading-relaxed text-indigo-500">{subtitle}</p>
      </div>
      <div className="flex max-w-lg flex-wrap justify-center gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onPick(s)}
            className="rounded-full border border-indigo-100 bg-white px-3.5 py-2 text-start text-xs text-indigo-900 shadow-sm hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function HistoryPanel({
  open,
  onClose,
  history,
  activeId,
  onNew,
  onSelect,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  history: Conversation[];
  activeId: string | null;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-20 flex">
      <button type="button" className="absolute inset-0 bg-indigo-950/20" aria-label="Fermer l’historique" onClick={onClose} />
      <div className="relative z-10 flex h-full w-[min(100%,18rem)] flex-col border-e border-indigo-100 bg-white shadow-xl">
        <div className="flex items-center gap-2 border-b border-indigo-100 p-3">
          <Button type="button" className="h-9 flex-1" onClick={onNew}>
            <Plus className="h-4 w-4" />
            Nouvelle conversation
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {history.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-indigo-400">Aucune conversation pour l’instant</p>
          ) : (
            <ul className="divide-y divide-indigo-50">
              {history.map((c) => (
                <li key={c.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className={cn(
                      "w-full px-3 py-3 text-start hover:bg-indigo-50",
                      activeId === c.id && "bg-violet-50",
                    )}
                  >
                    <p className="line-clamp-2 pe-7 text-sm font-medium leading-snug text-indigo-950">{c.title}</p>
                    <p className="mt-1 text-[11px] text-indigo-400">{formatRelative(c.updatedAt)}</p>
                  </button>
                  <button
                    type="button"
                    className="absolute end-1 top-2 hidden h-7 w-7 place-items-center rounded-md text-indigo-300 hover:text-rose-600 group-hover:grid"
                    aria-label="Supprimer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(c.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function AssistantDrawer() {
  const ctx = useContext(Ctx);
  const { user } = useAuth();
  if (!ctx?.open || !user) return null;
  return <AssistantDrawerInner onClose={() => ctx.setOpen(false)} />;
}

function AssistantDrawerInner({ onClose }: { onClose: () => void }) {
  const chat = useChatSession();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (chat.historyOpen) chat.setHistoryOpen(false);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, chat.historyOpen, chat.setHistoryOpen]);

  return createPortal(
    <>
      <button type="button" className="fixed inset-0 z-[70] bg-indigo-950/40" aria-label="Fermer" onClick={onClose} />
      <aside
        className={cn(
          "fixed z-[75] flex flex-col overflow-hidden border border-indigo-100 bg-white shadow-2xl",
          expanded ? "inset-3 rounded-2xl sm:inset-y-3 sm:start-auto sm:end-3 sm:w-[min(48rem,calc(100vw-1.5rem))]" : "inset-y-0 end-0 w-full max-w-[26rem] sm:max-w-[28rem]",
        )}
        role="dialog"
        aria-label="Assistant RH"
      >
        <ChatShell chat={chat} expanded={expanded} onToggleExpand={() => setExpanded((v) => !v)} onClose={onClose} />
      </aside>
    </>,
    document.body,
  );
}

export function AssistantPage() {
  const chat = useChatSession();
  return (
    <Card className="flex min-h-[calc(100dvh-10rem)] flex-col overflow-hidden p-0">
      <ChatShell chat={chat} />
    </Card>
  );
}

export function AssistantTrigger({ className }: { className?: string }) {
  const ctx = useContext(Ctx);
  return (
    <Button size="sm" variant="soft" className={className} onClick={() => ctx?.openFreshChat()}>
      <Sparkles className="h-4 w-4" />
      Assistant
    </Button>
  );
}
