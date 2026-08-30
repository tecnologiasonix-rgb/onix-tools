"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "onixwork-theme";
const DEFAULT_THEME: Theme = "dark"; // decisión de negocio confirmada explícitamente

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Script que se inyecta INLINE en <head> (ver ThemeScript más abajo, usado
 * en layout.tsx) y se ejecuta ANTES de que el navegador pinte cualquier
 * contenido — no espera a que React hidrate. Sin esto, habría un "flash"
 * visible: la página empezaría a renderizar con el tema por defecto del
 * navegador (normalmente claro) y saltaría a oscuro un instante después,
 * cuando React montara y leyera localStorage. Es puro JS sin dependencias
 * porque corre fuera del árbol de React, antes de que exista.
 */
export function ThemeScript() {
  const script = `
    (function() {
      try {
        var stored = localStorage.getItem('${STORAGE_KEY}');
        var theme = stored === 'light' || stored === 'dark' ? stored : '${DEFAULT_THEME}';
        document.documentElement.setAttribute('data-theme', theme);
      } catch (e) {
        document.documentElement.setAttribute('data-theme', '${DEFAULT_THEME}');
      }
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // El estado inicial de React se sincroniza leyendo el atributo que el
  // ThemeScript de arriba ya puso en <html> — así no hay un segundo salto
  // de tema cuando React toma el control, solo continúa con lo que el
  // script inline ya decidió.
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document === "undefined") return DEFAULT_THEME;
    const attr = document.documentElement.getAttribute("data-theme");
    return attr === "light" ? "light" : "dark";
  });

  function setTheme(t: Theme) {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // localStorage puede fallar en navegación privada estricta — el tema
      // simplemente no persistirá entre sesiones, pero la app sigue
      // funcionando con normalidad en la sesión actual.
    }
  }

  // Si otra pestaña cambia el tema, esta se sincroniza también.
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && (e.newValue === "light" || e.newValue === "dark")) {
        setThemeState(e.newValue);
        document.documentElement.setAttribute("data-theme", e.newValue);
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  return ctx;
}
