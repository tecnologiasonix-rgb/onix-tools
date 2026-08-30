"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { AssignmentDoc, UserDoc } from "@/lib/types";
import { PRODUCTS } from "@/lib/products";

export default function AdminHomePage() {
  const { getToken } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentDoc[]>([]);
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const [aRes, uRes] = await Promise.all([
        apiFetch("/api/admin/assignments", token),
        apiFetch("/api/admin/users", token),
      ]);
      const aData = await aRes.json();
      const uData = await uRes.json();
      setAssignments(aData.assignments ?? []);
      setUsers(uData.users ?? []);
      setLoading(false);
    })();
  }, [getToken]);

  const activos = assignments.filter((a) => a.status !== "vendido").length;
  const ventas = assignments.filter((a) => a.status === "vendido");
  const comisionTotal = ventas.reduce((sum, a) => sum + (a.sale?.comisionImporte ?? 0), 0);
  const vendedoresActivos = users.filter((u) => u.status === "activo" && u.role === "vendedor").length;
  const bloqueados = users.filter((u) => u.status === "bloqueado").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="h-6 w-6 animate-spin-slow rounded-full border-2 border-[var(--brand)] border-t-transparent" aria-hidden="true" />
      </div>
    );
  }

  const cards = [
    { label: "Leads en trabajo", value: activos, href: "/admin/leads" },
    { label: "Ventas totales", value: ventas.length, href: "/admin/ventas" },
    { label: "Comisión acumulada", value: `${comisionTotal.toFixed(2)} €`, href: "/admin/ventas" },
    { label: "Vendedores activos", value: vendedoresActivos, href: "/admin/usuarios" },
    { label: "Usuarios bloqueados", value: bloqueados, href: "/admin/usuarios" },
  ];

  return (
    <div className="animate-enter">
      <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
        Resumen
      </h1>
      <p className="mt-1 text-sm text-[var(--foreground-muted)]">
        Vista general de la plataforma.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="surface-card surface-card--interactive p-4">
            <p className="font-data text-2xl font-bold text-[var(--foreground)]">{c.value}</p>
            <p className="mt-1 text-[12.5px] text-[var(--foreground-faint)]">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Por producto</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {PRODUCTS.map((p) => {
            const productAssignments = assignments.filter((a) => a.productId === p.id);
            const productVentas = productAssignments.filter((a) => a.status === "vendido");
            return (
              <div key={p.id} className="surface-card p-4">
                <p className="font-semibold text-[var(--foreground)]">{p.name}</p>
                <div className="mt-2 flex gap-4 text-[13px] text-[var(--foreground-muted)]">
                  <span>
                    <span className="font-data font-semibold text-[var(--foreground)]">
                      {productAssignments.length - productVentas.length}
                    </span>{" "}
                    en curso
                  </span>
                  <span>
                    <span className="font-data font-semibold text-[var(--foreground)]">
                      {productVentas.length}
                    </span>{" "}
                    vendidos
                  </span>
                  <span>
                    <span className="font-data font-semibold text-[var(--status-vendido-fg)]">
                      {p.comisionPorcentaje}%
                    </span>{" "}
                    comisión
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
