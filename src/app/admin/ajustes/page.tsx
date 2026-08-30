"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";

export default function AdminAjustesPage() {
  const { getToken } = useAuth();
  const [visibleLeadsWindow, setVisibleLeadsWindow] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Distinto de `error` (que es el error de handleSave, se limpia solo):
  // loadError persiste hasta que la recarga inicial tenga éxito, porque si
  // no hay visibleLeadsWindow no hay nada que guardar todavía.
  const [loadError, setLoadError] = useState<string | null>(null);

  async function loadConfig() {
    setLoadError(null);
    try {
      const token = await getToken();
      const res = await apiFetch("/api/admin/config", token);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cargar la configuración");
      setVisibleLeadsWindow(data.config.visibleLeadsWindow);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Error al cargar la configuración");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial intencional al montar
    void loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken]);

  async function handleSave() {
    if (visibleLeadsWindow === null || visibleLeadsWindow < 1) {
      setError("Debe ser un número mayor que 0");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const token = await getToken();
      const res = await apiFetch("/api/admin/config", token, {
        method: "PATCH",
        body: JSON.stringify({ visibleLeadsWindow }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  if (visibleLeadsWindow === null) {
    if (loadError) {
      return (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <p className="max-w-sm text-sm font-medium text-[var(--danger)]">{loadError}</p>
          <button onClick={() => void loadConfig()} className="btn btn-secondary px-4 py-2 text-[13px]">
            Reintentar
          </button>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center py-20">
        <span className="h-6 w-6 animate-spin-slow rounded-full border-2 border-[var(--brand)] border-t-transparent" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="animate-enter">
      <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">Ajustes</h1>
      <p className="mt-1 text-sm text-[var(--foreground-muted)]">
        Configuración general de la plataforma.
      </p>

      <div className="surface-card mt-6 max-w-md p-5">
        <label className="mb-1.5 block text-[13px] font-medium text-[var(--foreground)]">
          Ventana de leads visibles
        </label>
        <p className="mb-3 text-[12.5px] leading-relaxed text-[var(--foreground-faint)]">
          Cuántos leads disponibles puede ver un vendedor a la vez en su cola, aunque
          la base tenga miles. Se muestran de forma progresiva a medida que trabaja
          los suyos.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            value={visibleLeadsWindow}
            onChange={(e) => setVisibleLeadsWindow(parseInt(e.target.value, 10) || 0)}
            className="field w-28"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className={`btn px-4 py-2 text-[13px] ${saved ? "btn-success" : "btn-primary"}`}
          >
            {saving ? "Guardando…" : saved ? "Guardado ✓" : "Guardar"}
          </button>
        </div>
        {error && (
          <p className="mt-2.5 text-[12.5px] font-medium text-[var(--danger)]">{error}</p>
        )}
      </div>
    </div>
  );
}
