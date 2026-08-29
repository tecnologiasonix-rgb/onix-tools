"use client";

import { useEffect } from "react";

/**
 * Registra el service worker de la PWA. Componente sin salida visual:
 * vive en el layout raíz y no debe bloquear el render de la app.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registro best-effort: si falla, la app sigue funcionando como web normal.
    });
  }, []);

  return null;
}
