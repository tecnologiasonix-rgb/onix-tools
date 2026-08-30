"use client";

import { useState } from "react";
import { SaleInfo } from "@/lib/types";

// El formulario solo captura HECHOS de la venta (qué pagó el cliente, cómo,
// cuándo, con qué referencia). La comisión NUNCA se captura aquí — la
// calcula el servidor a partir del % del producto en ese instante (ver
// src/lib/commission.ts). Este tipo es SaleInfo sin los campos de comisión,
// precisamente para que sea imposible construir aquí un objeto que los
// incluya por error.
export type SaleFormInput = Omit<SaleInfo, "comisionPorcentaje" | "comisionImporte">;

type Props = {
  leadName: string;
  onCancel: () => void;
  onSubmit: (sale: SaleFormInput) => Promise<void>;
};

function nowLocalDatetime(): string {
  // formato requerido por <input type="datetime-local">: YYYY-MM-DDTHH:mm
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function SaleForm({ leadName, onCancel, onSubmit }: Props) {
  const [importe, setImporte] = useState("");
  const [moneda, setMoneda] = useState("EUR");
  const [referenciaPago, setReferenciaPago] = useState("");
  const [fechaHoraPago, setFechaHoraPago] = useState(nowLocalDatetime());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const importeNum = parseFloat(importe.replace(",", "."));
    if (isNaN(importeNum) || importeNum <= 0) {
      setError("Introduce un importe válido");
      return;
    }
    if (referenciaPago.trim().length < 3) {
      setError("La referencia de pago es obligatoria (ID de transacción, factura, etc.)");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        importe: importeNum,
        moneda,
        referenciaPago: referenciaPago.trim(),
        fechaHoraPago: new Date(fechaHoraPago).toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar la venta");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="animate-overlay-in fixed inset-0 z-50 flex items-end justify-center bg-[var(--ink)]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onCancel();
      }}
    >
      <div className="animate-modal-in surface-card w-full max-w-md rounded-b-none p-6 shadow-[var(--shadow-lg)] sm:rounded-b-[var(--radius-lg)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-[var(--foreground)]">Registrar venta</h3>
            <p className="mt-0.5 text-sm text-[var(--foreground-faint)]">{leadName}</p>
          </div>
          <span className="badge bg-[var(--status-vendido-bg)] text-[var(--status-vendido-fg)]">
            Verificable
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <p className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2 text-[12.5px] text-[var(--foreground-faint)]">
            Registra el pago único del cliente. La comisión se calcula automáticamente al confirmar.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[var(--foreground)]">
                Importe
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={importe}
                onChange={(e) => setImporte(e.target.value)}
                placeholder="99.00"
                className="field font-data"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-[var(--foreground)]">
                Moneda
              </label>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value)}
                className="field font-data cursor-pointer"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--foreground)]">
              Referencia de pago (verificable)
            </label>
            <input
              type="text"
              value={referenciaPago}
              onChange={(e) => setReferenciaPago(e.target.value)}
              placeholder="Nº de factura, ID de transacción de Stripe/PayPal…"
              className="field font-data"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--foreground)]">
              Fecha y hora del pago
            </label>
            <input
              type="datetime-local"
              value={fechaHoraPago}
              onChange={(e) => setFechaHoraPago(e.target.value)}
              className="field font-data"
              required
            />
          </div>

          {error && (
            <p className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-2.5 py-1.5 text-[12.5px] font-medium text-[var(--danger)]">
              <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="btn btn-secondary px-4 py-2"
            >
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="btn btn-success px-4 py-2">
              {submitting && (
                <span className="h-3.5 w-3.5 animate-spin-slow rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
              )}
              {submitting ? "Guardando…" : "Confirmar venta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
