"use client";

import { useState } from "react";
import { EnrichedLead } from "@/lib/types";
import { LeadStatus, SaleInfo } from "@/lib/assignments";
import { SaleForm } from "@/components/SaleForm";

type Props = {
  lead: EnrichedLead;
  onSelect: () => Promise<void>;
  onChangeStatus: (status: LeadStatus, sale?: SaleInfo) => Promise<void>;
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  asignado: "Asignado",
  contactado: "Contactado",
  interesado: "Interesado",
  vendido: "Vendido",
  liberado: "Liberado",
};

const STATUS_COLORS: Record<LeadStatus, string> = {
  asignado: "bg-blue-100 text-blue-700",
  contactado: "bg-amber-100 text-amber-700",
  interesado: "bg-purple-100 text-purple-700",
  vendido: "bg-green-100 text-green-700",
  liberado: "bg-neutral-100 text-neutral-600",
};

function timeRemaining(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expirado";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m restantes`;
}

export function LeadCard({ lead, onSelect, onChangeStatus }: Props) {
  const [busy, setBusy] = useState(false);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const a = lead.assignment;

  async function handleSelect() {
    setBusy(true);
    setError(null);
    try {
      await onSelect();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function handleStatus(status: LeadStatus) {
    setBusy(true);
    setError(null);
    try {
      await onChangeStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaleSubmit(sale: SaleInfo) {
    await onChangeStatus("vendido", sale);
    setShowSaleForm(false);
  }

  return (
    <div className="border border-neutral-200 rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium truncate">{lead.nombre}</h3>
          <p className="text-sm text-neutral-500">{lead.tipo}</p>
        </div>
        {a && (
          <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${STATUS_COLORS[a.status]}`}>
            {STATUS_LABELS[a.status]}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1 text-sm text-neutral-600">
        {lead.direccion && <p>{lead.direccion}</p>}
        {lead.telefono && <p>Tel: {lead.telefono}</p>}
        {lead.email && <p>Email: {lead.email}</p>}
        {lead.web && (
          <p>
            <a href={lead.web} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
              {lead.web}
            </a>
          </p>
        )}
      </div>

      {lead.notas && (
        <p className="mt-3 text-sm text-neutral-500 line-clamp-3">{lead.notas}</p>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4">
        {!a && (
          <button
            onClick={handleSelect}
            disabled={busy}
            className="w-full text-sm bg-neutral-900 text-white rounded-md px-3 py-2 hover:bg-neutral-700 disabled:opacity-50"
          >
            {busy ? "Asignando…" : "Seleccionar lead"}
          </button>
        )}

        {a && !a.assignedToMe && (
          <div className="text-sm text-neutral-500 bg-neutral-50 rounded-md px-3 py-2">
            Asignado a <span className="font-medium">{a.assignedToName}</span>
            <br />
            <span className="text-xs">{timeRemaining(a.expiresAt)}</span>
          </div>
        )}

        {a && a.assignedToMe && a.status !== "vendido" && (
          <div className="space-y-2">
            <p className="text-xs text-neutral-400">{timeRemaining(a.expiresAt)}</p>
            <div className="flex flex-wrap gap-2">
              {a.status === "asignado" && (
                <button
                  onClick={() => handleStatus("contactado")}
                  disabled={busy}
                  className="text-sm border border-neutral-300 rounded-md px-3 py-1.5 hover:bg-neutral-50 disabled:opacity-50"
                >
                  Marcar contactado
                </button>
              )}
              {(a.status === "asignado" || a.status === "contactado") && (
                <button
                  onClick={() => handleStatus("interesado")}
                  disabled={busy}
                  className="text-sm border border-neutral-300 rounded-md px-3 py-1.5 hover:bg-neutral-50 disabled:opacity-50"
                >
                  Marcar interesado
                </button>
              )}
              <button
                onClick={() => setShowSaleForm(true)}
                disabled={busy}
                className="text-sm bg-green-600 text-white rounded-md px-3 py-1.5 hover:bg-green-700 disabled:opacity-50"
              >
                Registrar venta
              </button>
              <button
                onClick={() => {
                  if (confirm(`¿Liberar a ${lead.nombre}? Volverá a la lista de disponibles para cualquier vendedor.`)) {
                    handleStatus("liberado");
                  }
                }}
                disabled={busy}
                className="text-sm text-red-600 border border-red-200 rounded-md px-3 py-1.5 hover:bg-red-50 disabled:opacity-50"
              >
                Liberar lead
              </button>
            </div>
          </div>
        )}

        {a && a.status === "vendido" && a.sale && (
          <div className="text-sm bg-green-50 rounded-md px-3 py-2 space-y-0.5">
            <p className="font-medium text-green-700">
              Vendido — {a.sale.tipoPago === "suscripcion_mensual" ? "Suscripción mensual" : "Pago único"}
            </p>
            <p className="text-green-700">
              {a.sale.importe.toFixed(2)} {a.sale.moneda}
            </p>
            <p className="text-xs text-neutral-500">Ref: {a.sale.referenciaPago}</p>
            <p className="text-xs text-neutral-500">
              {new Date(a.sale.fechaHoraPago).toLocaleString("es-ES")}
            </p>
          </div>
        )}
      </div>

      {showSaleForm && (
        <SaleForm
          leadName={lead.nombre}
          onCancel={() => setShowSaleForm(false)}
          onSubmit={handleSaleSubmit}
        />
      )}
    </div>
  );
}
