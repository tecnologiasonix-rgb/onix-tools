"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { AssignmentDoc } from "@/lib/types";
import { getProduct } from "@/lib/products";
import { CountdownRing } from "@/components/CountdownRing";

const STATUS_LABELS: Record<string, string> = {
  asignado: "Asignado",
  contactado: "Contactado",
  interesado: "Interesado",
  vendido: "Vendido",
};

export default function AdminLeadsPage() {
  const { getToken } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const token = await getToken();
      const res = await apiFetch("/api/admin/assignments", token);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cargar los leads");
      setAssignments(data.assignments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar los leads");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial intencional al montar
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRelease(a: AssignmentDoc) {
    if (!confirm(`¿Liberar manualmente este lead de ${a.userName}? Volverá a la cola de disponibles.`)) return;
    const id = `${a.productId}_${a.leadId}`;
    setBusyId(id);
    setError(null);
    try {
      const token = await getToken();
      const res = await apiFetch("/api/admin/assignments", token, {
        method: "POST",
        body: JSON.stringify({ productId: a.productId, leadId: a.leadId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al liberar el lead");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusyId(null);
    }
  }

  const activas = assignments.filter((a) => a.status !== "vendido");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="h-6 w-6 animate-spin-slow rounded-full border-2 border-[var(--brand)] border-t-transparent" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="animate-enter">
      <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
        Leads en trabajo
      </h1>
      <p className="mt-1 text-sm text-[var(--foreground-muted)]">
        {activas.length} lead{activas.length === 1 ? "" : "s"} activo{activas.length === 1 ? "" : "s"} ahora mismo, de cualquier vendedor.
      </p>

      {error && (
        <p className="mt-3 flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-2.5 py-1.5 text-[12.5px] font-medium text-[var(--danger)]">
          {error}
        </p>
      )}

      <div className="mt-5 space-y-2">
        {activas.map((a) => {
          const id = `${a.productId}_${a.leadId}`;
          const product = getProduct(a.productId);
          return (
            <div key={id} className="surface-card flex flex-wrap items-center justify-between gap-3 p-3.5">
              <div className="min-w-0">
                <p className="flex items-center gap-2">
                  <span className="badge bg-[var(--surface-sunken)] text-[var(--foreground-faint)]">
                    {product?.name ?? a.productId}
                  </span>
                  <span className="badge bg-[var(--brand-tint)] text-[var(--brand-active)]">
                    {STATUS_LABELS[a.status] ?? a.status}
                  </span>
                </p>
                <p className="mt-1 font-medium text-[var(--foreground)]">
                  Asignado a {a.userName}
                  {a.renewalCount > 0 && (
                    <span className="ml-1.5 font-data text-[12px] font-normal text-[var(--foreground-faint)]">
                      · renovado {a.renewalCount}×
                    </span>
                  )}
                </p>
                <p className="truncate text-[12.5px] text-[var(--foreground-faint)]">{a.userEmail}</p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <CountdownRing expiresAt={a.expiresAt} size={34} />
                <button
                  onClick={() => handleRelease(a)}
                  disabled={busyId === id}
                  className="btn btn-danger-outline px-3 py-1.5 text-[12.5px]"
                >
                  Liberar
                </button>
              </div>
            </div>
          );
        })}

        {activas.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--foreground-faint)]">
            No hay leads activos ahora mismo.
          </p>
        )}
      </div>
    </div>
  );
}
