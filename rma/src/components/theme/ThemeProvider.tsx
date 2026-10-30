"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeCtx>({ theme: "light", toggle: () => {} });

export function useTheme(): ThemeCtx {
  return useContext(ThemeContext);
}

// The theme lives OUTSIDE React (localStorage + the OS media query), so it is
// modelled as a tiny external store. The server snapshot is "light" (matches
// the pre-hydration HTML); the client snapshot reads storage/media query, and
// React re-checks it right after hydration — same visible result as the old
// setState-on-mount effect, without setState inside an effect.
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function readTheme(): Theme {
  const stored = localStorage.getItem("take-theme") as Theme | null;
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const serverTheme = (): Theme => "light";

function toggleTheme() {
  const next: Theme = readTheme() === "dark" ? "light" : "dark";
  localStorage.setItem("take-theme", next);
  document.documentElement.classList.toggle("dark", next === "dark");
  for (const l of listeners) l();
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readTheme, serverTheme);

  // Keep the <html> class in sync (covers the initial client value; toggles
  // already set it synchronously inside toggleTheme).
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle: toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
