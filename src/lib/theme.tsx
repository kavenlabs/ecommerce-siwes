import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);

const STORAGE_KEY = "store_theme";

/*
 * Deliberately NOT a lazy useState initializer. Reading localStorage during
 * render would make the first client render disagree with the server, which
 * has no localStorage, and React would fail hydration on the theme toggle.
 * The stored value is applied in an effect after mount instead; the inline
 * script in the document head already sets the class before first paint, so
 * there is no flash of the wrong theme.
 */

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  /*
   * Guards the persist effect until the stored value has been read. Without
   * it, the write effect runs in the same commit as the read effect and saves
   * the initial "light" over a stored "dark" before it is ever loaded.
   */
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    setTheme(
      saved === "light" || saved === "dark"
        ? saved
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light",
    );
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, loaded]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;

  /*
   * The toaster is mounted in the document shell, which sits above this
   * provider, so components rendered there cannot read the context. Fall back
   * to the document class, which the inline head script and the effect below
   * both keep in sync.
   */
  return {
    theme: resolveDocumentTheme(),
    toggle: () => {
      const next = resolveDocumentTheme() === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      localStorage.setItem(STORAGE_KEY, next);
    },
  };
}

function resolveDocumentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}
