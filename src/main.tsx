import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useEffect } from "react";
import { App } from "./App";
import { AuthProvider } from "./lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { onUnauthorized } from "./lib/api";
import { applyLang, readLang } from "./lib/lang";
import { scrollContentTop } from "./lib/utils";
import "./index.css";

applyLang(readLang());

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, err) => {
        if (err instanceof Error && err.message === "UNAUTHORIZED") return false;
        return count < 1;
      },
      refetchOnWindowFocus: false,
    },
  },
});

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    scrollContentTop();
  }, [pathname]);
  return null;
}

function UnauthorizedBridge() {
  const navigate = useNavigate();
  useEffect(() => {
    return onUnauthorized(() => {
      queryClient.clear();
      navigate("/login", { replace: true });
    });
  }, [navigate]);
  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <I18nProvider>
          <AuthProvider>
            <UnauthorizedBridge />
            <ScrollToTop />
            <App />
            <Toaster
              position="top-right"
              closeButton
              expand
              duration={3800}
              offset={16}
              gap={10}
              toastOptions={{
                className: "rh-toast",
              }}
            />
          </AuthProvider>
        </I18nProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
