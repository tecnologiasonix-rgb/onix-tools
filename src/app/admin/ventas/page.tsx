"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { AssignmentDoc } from "@/lib/types";
import { getProduct } from "@/lib/products";

export default function AdminVentasPage() {
  const { getToken } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const res = await apiFetch("/api/admin/assignments", token);
      const data = await res.json();
      setAssignments(data.assignments ?? []);
      setLoading(false);
    })();
  }, [getToken]);

  const ventas = assignments
    .filter((a) => a.status === "vendido" && a.sale)
    .sort((a, b) => new Date(b.sale!.fechaHoraPago).getTime() - new Date(a.sale!.fechaHoraPago).getTime());

  const totalImporte = ventas.reduce((sum, a) => sum + a.sale!.importe, 0);
  const totalComision = ventas.reduce((sum, a) => sum + a.sale!.comisionImporte, 0);

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
        Ventas y comisiones
      </h1>
      <p className="mt-1 text-sm text-[var(--foreground-muted)]">
        {ventas.length} venta{ventas.length === 1 ? "" : "s"} registrada{ventas.length === 1 ? "" : "s"}.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="surface-card p-3.5">
          <p className="font-data text-xl font-bold text-[var(--foreground)]">
            {totalImporte.toFixed(2)} €
          </p>
          <p className="text-[12px] text-[var(--foreground-faint)]">Facturado total</p>
        </div>
        <div className="surface-card p-3.5">
          <p className="font-data text-xl font-bold text-[var(--status-vendido-fg)]">
            {totalComision.toFixed(2)} €
          </p>
          <p className="text-[12px] text-[var(--foreground-faint)]">Comisión a pagar</p>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {ventas.map((a) => {
          const product = getProduct(a.productId);
          return (
            <div key={`${a.productId}_${a.leadId}`} className="surface-card p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2">
                    <span className="badge bg-[var(--surface-sunken)] text-[var(--foreground-faint)]">
                      {product?.name ?? a.productId}
                    </span>
                    {a.referralCode && (
                      <span
                        className="badge bg-[var(--brand-tint)] font-data text-[var(--brand-active)]"
                        title="Esta venta tiene un enlace de referido asociado"
                      >
                        ref: {a.referralCode}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 font-medium text-[var(--foreground)]">
                    Vendido por {a.userName}
                  </p>
                  <p className="font-data text-[12px] text-[var(--foreground-faint)]">
                    {new Date(a.sale!.fechaHoraPago).toLocaleString("es-ES")} · Ref: {a.sale!.referenciaPago}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-data text-lg font-bold text-[var(--foreground)]">
                    {a.sale!.importe.toFixed(2)} {a.sale!.moneda}
                  </p>
                  <p className="font-data text-[12.5px] font-medium text-[var(--status-vendido-fg)]">
                    +{a.sale!.comisionImporte.toFixed(2)} € ({a.sale!.comisionPorcentaje}%)
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {ventas.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--foreground-faint)]">
            Todavía no hay ventas registradas.
          </p>
        )}
      </div>
    </div>
  );
}
