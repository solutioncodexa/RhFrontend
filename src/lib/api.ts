import type { AuthUser, PageResult } from "./types";
import { asRecord } from "./utils";

const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

const ACCESS_KEY = "rhflow.accessToken";
const REFRESH_KEY = "rhflow.refreshToken";
const USER_KEY = "rhflow.user";

export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string | null;
  data?: T;
};

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorized(listener: UnauthorizedListener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

function emitUnauthorized() {
  unauthorizedListeners.forEach((l) => {
    try {
      l();
    } catch {
      /* ignore */
    }
  });
}

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function saveSession(accessToken: string, refreshToken: string, user: unknown) {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function readStoredUser<T>(): T | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function extractTokens(payload: Record<string, unknown>) {
  const nested = asRecord(payload.tokens);
  const accessToken = String(payload.accessToken ?? nested.accessToken ?? "");
  const refreshToken = String(payload.refreshToken ?? nested.refreshToken ?? "");
  const user = (payload.user ?? nested.user) as AuthUser | undefined;
  return { accessToken, refreshToken, user };
}

function unwrap<T>(json: unknown): T {
  if (json && typeof json === "object" && "data" in json) {
    const env = json as ApiEnvelope<T>;
    if (env.success === false) {
      throw new Error(env.message || "Erreur API");
    }
    return env.data as T;
  }
  return json as T;
}

function errorMessage(json: unknown, fallback: string) {
  if (json && typeof json === "object") {
    const o = json as Record<string, unknown>;
    return String(o.message ?? o.detail ?? o.error ?? fallback);
  }
  return fallback;
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearSession();
      emitUnauthorized();
      return null;
    }
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken, deviceType: "WEB" }),
      });
      if (!res.ok) {
        clearSession();
        emitUnauthorized();
        return null;
      }
      const json = await res.json();
      const data = asRecord(unwrap(json));
      const tokens = extractTokens(data);
      if (!tokens.accessToken) {
        clearSession();
        emitUnauthorized();
        return null;
      }
      const user = tokens.user ?? readStoredUser();
      saveSession(tokens.accessToken, tokens.refreshToken || refreshToken, user);
      return tokens.accessToken;
    } catch {
      clearSession();
      emitUnauthorized();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error("Réseau indisponible. Vérifiez que l’API tourne sur localhost:8080.");
  }

  const isAuth =
    path.startsWith("/auth/login") ||
    path.startsWith("/auth/refresh") ||
    path.startsWith("/auth/logout") ||
    path.startsWith("/auth/register") ||
    path.startsWith("/auth/forgot-password");

  if (res.status === 401 && retry && !isAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) return apiFetch<T>(path, options, false);
    throw new Error("UNAUTHORIZED");
  }

  if (res.status === 401) {
    if (!isAuth) {
      clearSession();
      emitUnauthorized();
    }
    let detail = "UNAUTHORIZED";
    try {
      detail = errorMessage(await res.json(), detail);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  if (!res.ok) {
    let detail = res.statusText || `Erreur ${res.status}`;
    try {
      detail = errorMessage(await res.json(), detail);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  if (res.status === 204) return undefined as T;
  const json = await res.json();
  return unwrap<T>(json);
}

export async function apiFetchBlob(path: string, retry = true): Promise<Blob> {
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { headers });
  } catch {
    throw new Error("Réseau indisponible");
  }
  if (res.status === 401 && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) return apiFetchBlob(path, false);
    throw new Error("UNAUTHORIZED");
  }
  if (res.status === 401) {
    clearSession();
    emitUnauthorized();
    throw new Error("UNAUTHORIZED");
  }
  if (!res.ok) {
    let message = `Téléchargement impossible (${res.status})`;
    try {
      const json = (await res.json()) as { message?: string };
      if (json?.message) message = json.message;
    } catch {
      /* le corps n’est pas du JSON */
    }
    throw new Error(message);
  }
  return res.blob();
}

export function toQuery(params: Record<string, string | number | boolean | undefined | null>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function normalizePage<T>(raw: unknown, page = 0, size = 20): PageResult<T> {
  if (Array.isArray(raw)) {
    return {
      content: raw as T[],
      page,
      size,
      totalElements: raw.length,
      totalPages: 1,
    };
  }
  const o = asRecord(raw);
  const nested = Array.isArray(o.content)
    ? (o.content as T[])
    : Array.isArray(o.items)
      ? (o.items as T[])
      : Array.isArray(o.data)
        ? (o.data as T[])
        : [];
  return {
    content: nested,
    page: Number(o.number ?? o.page ?? page) || 0,
    size: Number(o.size ?? size) || size,
    totalElements: Number(o.totalElements ?? o.total ?? nested.length) || nested.length,
    totalPages: Number(o.totalPages ?? 1) || 1,
  };
}

export function listResource<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined | null> = {},
) {
  return apiFetch<unknown>(`${path}${toQuery(params)}`).then((raw) =>
    normalizePage<T>(raw, Number(params.page ?? 0), Number(params.size ?? 20)),
  );
}

export function getResource<T>(path: string, id: string | number) {
  return apiFetch<T>(`${path}/${id}`);
}

export function createResource<T>(path: string, body: unknown) {
  return apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function updateResource<T>(path: string, id: string | number, body: unknown) {
  return apiFetch<T>(`${path}/${id}`, { method: "PUT", body: JSON.stringify(body) });
}

export function patchResource<T>(path: string, id: string | number, body: unknown) {
  return apiFetch<T>(`${path}/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function deleteResource(path: string, id: string | number) {
  return apiFetch<void>(`${path}/${id}`, { method: "DELETE" });
}

export async function loginRequest(email: string, password: string, rememberMe = false) {
  const data = asRecord(
    await apiFetch<unknown>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, deviceType: "WEB", rememberMe }),
    }),
  );
  const tokens = extractTokens(data);
  if (!tokens.accessToken || !tokens.user) {
    throw new Error("Réponse de connexion inattendue");
  }
  saveSession(tokens.accessToken, tokens.refreshToken, tokens.user);
  return tokens.user;
}

export async function fetchMe() {
  try {
    return await apiFetch<AuthUser>("/me");
  } catch {
    return apiFetch<AuthUser>("/auth/me");
  }
}

export async function logoutRequest() {
  try {
    await apiFetch<void>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken: getRefreshToken() }),
    });
  } catch {
    /* ignore */
  }
  clearSession();
}

export function uploadImage(path: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiFetch<Record<string, unknown>>(path, { method: "POST", body });
}

export function uploadDocument(input: {
  file: File;
  employeeId?: string;
  contractId?: string;
  category?: string;
  name?: string;
  visibleToEmployee?: boolean;
}) {
  const body = new FormData();
  body.append("file", input.file);
  if (input.employeeId) body.append("employeeId", input.employeeId);
  if (input.contractId) body.append("contractId", input.contractId);
  if (input.category) body.append("category", input.category);
  if (input.name) body.append("name", input.name);
  if (input.visibleToEmployee === false) body.append("visibleToEmployee", "false");
  return apiFetch<Record<string, unknown>>("/documents/upload", { method: "POST", body });
}

export async function downloadNamed(path: string, filename: string) {
  const blob = await apiFetchBlob(path);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export { API_BASE };
