"use client";

import { useState } from "react";
import { SaleInfo } from "@/lib/assignments";

type Props = {
  leadName: string;
  onCancel: () => void;
  onSubmit: (sale: SaleInfo) => Promise<void>;
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
  const [tipoPago, setTipoPago] = useState<SaleInfo["tipoPago"]>("pago_unico");
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
        tipoPago,
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <h3 className="font-semibold mb-1">Registrar venta</h3>
        <p className="text-sm text-neutral-500 mb-4">{leadName}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tipo de pago</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  checked={tipoPago === "pago_unico"}
                  onChange={() => setTipoPago("pago_unico")}
                />
                Pago único
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  checked={tipoPago === "suscripcion_mensual"}
                  onChange={() => setTipoPago("suscripcion_mensual")}
                />
                Suscripción mensual
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Importe</label>
              <input
                type="text"
                inputMode="decimal"
                value={importe}
                onChange={(e) => setImporte(e.target.value)}
                placeholder="99.00"
                className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Moneda</label>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value)}
                className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Referencia de pago (verificable)
            </label>
            <input
              type="text"
              value={referenciaPago}
              onChange={(e) => setReferenciaPago(e.target.value)}
              placeholder="Nº de factura, ID de transacción de Stripe/PayPal…"
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Fecha y hora del pago</label>
            <input
              type="datetime-local"
              value={fechaHoraPago}
              onChange={(e) => setFechaHoraPago(e.target.value)}
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="text-sm px-4 py-2 rounded-md border border-neutral-300 hover:bg-neutral-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="text-sm px-4 py-2 rounded-md bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {submitting ? "Guardando…" : "Confirmar venta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
