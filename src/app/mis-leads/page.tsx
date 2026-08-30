"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { AssignmentDoc, LeadStatus, Lead } from "@/lib/types";

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

const STATUS_BADGE_CLASS: Record<string, string> = {
  asignado: "bg-[var(--status-asignado-bg)] text-[var(--status-asignado-fg)]",
  contactado: "bg-[var(--status-contactado-bg)] text-[var(--status-contactado-fg)]",
  interesado: "bg-[var(--status-interesado-bg)] text-[var(--status-interesado-fg)]",
  vendido: "bg-[var(--status-vendido-bg)] text-[var(--status-vendido-fg)]",
  liberado: "bg-[var(--status-liberado-bg)] text-[var(--status-liberado-fg)]",
};

const STATUS_ACCENT: Record<string, string> = {
  asignado: "var(--status-asignado)",
  contactado: "var(--status-contactado)",
  interesado: "var(--status-interesado)",
  vendido: "var(--status-vendido)",
  liberado: "var(--status-liberado)",
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

  if (authLoading) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-7 sm:px-6 sm:py-8">
          <div className="animate-enter mx-auto mt-16 flex max-w-xs flex-col items-center gap-3 text-center">
            <span
              className="h-6 w-6 animate-spin-slow rounded-full border-2 border-[var(--brand)] border-t-transparent"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-[var(--foreground-faint)]">Cargando tu sesión…</p>
          </div>
        </main>
      </>
    );
  }
  if (!user) return null;

  const ventas = items.filter((i) => i.assignment.status === "vendido");
  // Los importes pueden estar en distintas monedas (EUR, USD…): sumarlos
  // todos juntos daría un total sin sentido, así que agrupamos por moneda.
  const totalesPorMoneda = ventas.reduce<Record<string, number>>((acc, i) => {
    if (!i.assignment.sale) return acc;
    const { moneda, importe } = i.assignment.sale;
    acc[moneda] = (acc[moneda] ?? 0) + importe;
    return acc;
  }, {});
  const totalVentasLabel = Object.entries(totalesPorMoneda)
    .map(([moneda, total]) => `${total.toFixed(2)} ${moneda}`)
    .join(" + ");

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-7 sm:px-6 sm:py-8">
        <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
          Mis leads
        </h1>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="surface-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--foreground-faint)]">
              Gestionados
            </p>
            <p className="font-data mt-1 text-2xl font-bold text-[var(--foreground)]">
              {items.length}
            </p>
          </div>
          <div className="surface-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--foreground-faint)]">
              Ventas cerradas
            </p>
            <p className="font-data mt-1 text-2xl font-bold text-[var(--status-vendido-fg)]">
              {ventas.length}
            </p>
          </div>
          <div className="surface-card col-span-2 p-4 sm:col-span-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--foreground-faint)]">
              Total facturado
            </p>
            <p className="font-data mt-1 truncate text-2xl font-bold text-[var(--brand)]">
              {totalVentasLabel || "—"}
            </p>
          </div>
        </div>

        <div className="mt-7">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="surface-card flex items-center gap-4 p-4">
                  <div className="skeleton h-10 w-10 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3.5 w-1/3" />
                    <div className="skeleton h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="animate-enter flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] py-16 text-center">
              <svg aria-hidden="true" viewBox="0 0 40 40" fill="none" className="h-9 w-9 text-[var(--foreground-faint)]">
                <path d="M10 14h20a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V16a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 16.5 20 25l12-8.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              <p className="font-medium text-[var(--foreground-muted)]">
                Todavía no has seleccionado ningún lead
              </p>
              <p className="text-sm text-[var(--foreground-faint)]">
                Elige un producto y reclama tu primer lead.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(({ assignment, lead, productName }) => {
                const status = assignment.status as LeadStatus;
                return (
                  <div
                    key={`${assignment.productId}_${assignment.leadId}`}
                    className="surface-card animate-enter flex items-start justify-between gap-4 p-4"
                    style={{ borderLeft: `3px solid ${STATUS_ACCENT[status]}` }}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--foreground)]">
                        {lead?.nombre ?? assignment.leadId}
                      </p>
                      <p className="text-[13px] text-[var(--foreground-faint)]">{productName}</p>
                      {lead?.telefono && (
                        <p className="font-data mt-1 text-[13px] text-[var(--foreground-muted)]">
                          {lead.telefono}
                        </p>
                      )}
                      <p className="mt-1.5 text-[11.5px] text-[var(--foreground-faint)]">
                        Asignado: {new Date(assignment.assignedAt).toLocaleString("es-ES")}
                      </p>
                      {assignment.sale && (
                        <p className="font-data mt-1 text-[12px] font-medium text-[var(--status-vendido-fg)]">
                          {assignment.sale.importe.toFixed(2)} {assignment.sale.moneda} · comisión{" "}
                          {assignment.sale.comisionImporte.toFixed(2)} {assignment.sale.moneda} ·{" "}
                          {new Date(assignment.sale.fechaHoraPago).toLocaleString("es-ES")}
                        </p>
                      )}
                    </div>
                    <span className={`badge shrink-0 ${STATUS_BADGE_CLASS[status] ?? ""}`}>
                      {STATUS_LABELS[status] ?? status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
