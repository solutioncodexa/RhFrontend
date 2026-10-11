import { createPortal } from "react-dom";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Languages, LogOut, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { homeForUser, useAuth } from "@/lib/auth";
import { useI18n, type TKey } from "@/lib/i18n";
import { employeeNav, navGroups, platformNav, visibleItems, type NavItem } from "@/lib/nav";
import { normalizeRole, type AuthUser } from "@/lib/types";
import { cn, fullName, scrollContentTop } from "@/lib/utils";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationBell } from "./NotificationBell";
import { Button, ShellSkeleton } from "./ui";
import { AssistantProvider, AssistantTrigger } from "./AssistantPanel";

export function AppShell({ mode }: { mode: "app" | "portal" | "platform" }) {
  const { user, logout, loading, isAuthenticated } = useAuth();
  const { lang, toggle, t } = useI18n();
  const navigate = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const role = user ? normalizeRole(user.role) : "";
  const shellRole =
    role === "SUPER_ADMIN" ? "superadmin" : role === "MANAGER" ? "manager" : role === "EMPLOYEE" ? "employee" : role ? "admin" : "";

  useEffect(() => {
    const root = document.documentElement;
    if (!shellRole) {
      delete root.dataset.role;
      return;
    }
    root.dataset.role = shellRole;
    return () => {
      delete root.dataset.role;
    };
  }, [shellRole]);

  useEffect(() => {
    setOpen(false);
    scrollContentTop();
    mainRef.current?.scrollTo(0, 0);
  }, [loc.pathname]);

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/login", { replace: true, state: { from: loc.pathname } });
  }, [loading, isAuthenticated, navigate, loc.pathname]);

  useEffect(() => {
    if (loading || !user) return;
    const role = normalizeRole(user.role);
    if (mode === "app" && role === "EMPLOYEE") navigate("/portal", { replace: true });
    if (mode === "app" && role === "SUPER_ADMIN") navigate("/platform", { replace: true });
    if (mode === "platform" && role !== "SUPER_ADMIN") navigate(homeForUser(user), { replace: true });
    if (mode === "portal" && role === "SUPER_ADMIN") navigate("/platform", { replace: true });
    if (mode === "app" && role !== "EMPLOYEE" && role !== "SUPER_ADMIN") {
      const items = navGroups.flatMap((group) => group.items);
      const match = items
        .filter((item) => loc.pathname === item.to || loc.pathname.startsWith(item.to + "/"))
        .sort((a, b) => b.to.length - a.to.length)[0];
      if (match && !visibleItems(user, [match]).length) navigate("/app", { replace: true });
    }
  }, [loading, user, mode, navigate, loc.pathname]);

  if (loading || !user) {
    return (
      <ShellSkeleton />
    );
  }

  const employee = shellRole === "employee";
  const groups =
    mode === "platform"
      ? [{ label: "platform" as const, items: platformNav }]
      : mode === "portal"
        ? [{ label: "portalHome" as const, items: employeeNav }]
        : navGroups;
  const dock = employee ? visibleItems(user, employeeNav).slice(0, 4) : [];

  return (
    <AssistantProvider>
    <div data-role={shellRole} className="flex h-dvh overflow-hidden bg-[var(--role-bg)] text-[var(--role-ink)]">
      <aside className={cn("shell-rail hidden h-full w-64 shrink-0 flex-col text-indigo-100", employee ? "min-[1025px]:flex" : "md:flex")}>
        <Sidebar groups={groups} user={user} role={role} />
      </aside>
      {open
        ? createPortal(
            <>
              <button
                type="button"
                className="shell-scrim fixed inset-0 z-[55] min-[1025px]:hidden"
                aria-label="Fermer le menu"
                onClick={() => setOpen(false)}
              />
              <aside className="shell-drawer fixed inset-y-0 start-0 z-[60] flex h-full w-72 max-w-[85vw] flex-col text-indigo-100 min-[1025px]:hidden">
                <Sidebar groups={groups} user={user} role={role} onClose={() => setOpen(false)} />
              </aside>
            </>,
            document.body,
          )
        : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="z-30 flex shrink-0 items-center gap-2 border-b border-[var(--role-line)] bg-[var(--role-card)]/90 px-3 py-2 backdrop-blur sm:gap-3 sm:px-4 sm:py-3">
          <button className={cn("rounded-xl p-2 text-[var(--role-ink)]", employee ? "min-[1025px]:hidden" : "md:hidden")} onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <GlobalSearch />
          </div>
          <div className="ms-auto flex shrink-0 items-center gap-1">
            <Button size="sm" variant="ghost" onClick={toggle} title="FR / AR">
              <Languages className="h-4 w-4" />
              <span className="hidden sm:inline">{lang.toUpperCase()}</span>
            </Button>
            <NotificationBell mode={mode} />
            <AssistantTrigger />
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main ref={mainRef} className={cn("min-h-0 flex-1 overflow-y-auto", employee && "pb-[calc(4.5rem+env(safe-area-inset-bottom))] min-[1025px]:pb-0")}>
          <div key={loc.pathname} className="page-enter mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
            <Outlet />
          </div>
        </main>
        {employee ? (
          <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--role-line)] bg-[var(--role-card)]/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur min-[1025px]:hidden">
            <button type="button" className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold text-[#525252]" onClick={() => setOpen(true)}>
              <Menu className="h-5 w-5" />
              <span className="truncate">{t("menu")}</span>
            </button>
            {dock.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/portal"}
                className={({ isActive }) =>
                  cn("flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold", isActive ? "text-[var(--role-accent)]" : "text-[#525252]")
                }
              >
                <item.icon className="h-5 w-5" />
                <span className="max-w-full truncate px-1">{t(item.key)}</span>
              </NavLink>
            ))}
          </nav>
        ) : null}
      </div>
    </div>
    </AssistantProvider>
  );
}

function Sidebar({
  groups,
  user,
  role,
  onClose,
}: {
  groups: { label: TKey; items: NavItem[] }[];
  user: AuthUser;
  role: string;
  onClose?: () => void;
}) {
  const { t } = useI18n();
  return (
    <>
      <div className="flex items-center justify-between px-5 py-5">
        <Link to={homeForUser(user)} className="flex items-center gap-2 text-white">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--role-accent)] text-[11px] font-bold">RH</span>
          <span className="shell-label text-lg font-extrabold tracking-tight">RHFlow</span>
        </Link>
        {onClose ? (
          <button className="lg:hidden" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>
      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-8">
        {groups.map((g) => {
          const items = visibleItems(user, g.items);
          if (!items.length) return null;
          return (
            <div key={g.label}>
              <p className="shell-group px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                {t(g.label)}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === "/app" || item.to === "/portal" || item.to === "/platform"}
                      title={t(item.key)}
                      className={({ isActive }) =>
                        cn(
                          "shell-link flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition duration-200",
                          isActive ? "bg-[var(--role-accent)] text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
                        )
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0 opacity-80" />
                      <span className="shell-label">{t(item.key)}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-4 py-4 text-xs text-white/55">
        <div className="shell-footer-text">
          <p className="font-semibold text-white">{fullName(user as unknown as Record<string, unknown>)}</p>
          <p className="truncate">{user.email}</p>
          <p className="mt-1 uppercase tracking-wide text-[var(--role-accent)]">{role}</p>
        </div>
      </div>
    </>
  );
}
