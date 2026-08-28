"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { AssignmentDoc } from "@/lib/assignments";
import { Lead } from "@/lib/csv";

type Item = {
  assignment: AssignmentDoc;
  lead: Lead | null;
  productName: string;
};

const STATUS_LABELS: Record<string, string> = {
  asignado: "Asignado",
  contactado: "Contactado",
  interesado: "Interesado",
  vendido: "Vendido",
  liberado: "Liberado",
};

export default function MisLeadsPage() {
  const { user, loading: authLoading, getToken } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
      return;
    }
    if (!user) return;

    (async () => {
      const token = await getToken();
      const res = await apiFetch("/api/my-leads", token);
      const data = await res.json();
      setItems(data.items ?? []);
      setLoading(false);
    })();
  }, [user, authLoading, router, getToken]);

  if (authLoading || !user) return null;

  const ventas = items.filter((i) => i.assignment.status === "vendido");
  const totalVentas = ventas.reduce((sum, i) => sum + (i.assignment.sale?.importe ?? 0), 0);

  return (
    <>
      <Header />
      <main className="flex-1 mx-auto max-w-4xl w-full px-4 py-8">
        <h1 className="text-xl font-semibold mb-1">Mis leads</h1>
        <p className="text-sm text-neutral-500 mb-6">
          {items.length} leads gestionados · {ventas.length} ventas · {totalVentas.toFixed(2)}{" "}
          {ventas[0]?.assignment.sale?.moneda ?? "EUR"} en total
        </p>

        {loading ? (
          <p className="text-neutral-400">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="text-neutral-400">Todavía no has seleccionado ningún lead.</p>
        ) : (
          <div className="space-y-3">
            {items.map(({ assignment, lead, productName }) => (
              <div
                key={`${assignment.productId}_${assignment.leadId}`}
                className="border border-neutral-200 rounded-lg p-4 bg-white flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{lead?.nombre ?? assignment.leadId}</p>
                  <p className="text-sm text-neutral-500">{productName}</p>
                  {lead?.telefono && (
                    <p className="text-sm text-neutral-500">Tel: {lead.telefono}</p>
                  )}
                  <p className="text-xs text-neutral-400 mt-1">
                    Asignado: {new Date(assignment.assignedAt).toLocaleString("es-ES")}
                  </p>
                  {assignment.sale && (
                    <p className="text-xs text-green-700 mt-1">
                      Venta: {assignment.sale.importe.toFixed(2)} {assignment.sale.moneda} ·{" "}
                      {assignment.sale.tipoPago === "suscripcion_mensual"
                        ? "Suscripción mensual"
                        : "Pago único"}{" "}
                      · {new Date(assignment.sale.fechaHoraPago).toLocaleString("es-ES")}
                    </p>
                  )}
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-neutral-100 whitespace-nowrap">
                  {STATUS_LABELS[assignment.status] ?? assignment.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
