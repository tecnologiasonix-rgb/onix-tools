"use client";

import { useState } from "react";
import { EnrichedLead, LeadStatus, SaleInfo } from "@/lib/types";
import { SaleForm, SaleFormInput } from "@/components/SaleForm";
import { CountdownRing } from "@/components/CountdownRing";

type Props = {
  lead: EnrichedLead;
  onSelect: () => Promise<void>;
  onChangeStatus: (status: LeadStatus, sale?: SaleFormInput) => Promise<void>;
  onRenew: () => Promise<void>;
  onGenerateReferral: () => Promise<string>; // devuelve la URL generada
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  asignado: "Asignado",
  contactado: "Contactado",
  interesado: "Interesado",
  vendido: "Vendido",
  liberado: "Liberado",
};

// Cada estado lleva su color de acento (borde + badge) y su color de fondo/texto
// de badge, derivados de los tokens de globals.css — nunca colores sueltos aquí.
const STATUS_ACCENT: Record<LeadStatus, string> = {
  asignado: "var(--status-asignado)",
  contactado: "var(--status-contactado)",
  interesado: "var(--status-interesado)",
  vendido: "var(--status-vendido)",
  liberado: "var(--status-liberado)",
};

const STATUS_BADGE_CLASS: Record<LeadStatus, string> = {
  asignado: "bg-[var(--status-asignado-bg)] text-[var(--status-asignado-fg)]",
  contactado: "bg-[var(--status-contactado-bg)] text-[var(--status-contactado-fg)]",
  interesado: "bg-[var(--status-interesado-bg)] text-[var(--status-interesado-fg)]",
  vendido: "bg-[var(--status-vendido-bg)] text-[var(--status-vendido-fg)]",
  liberado: "bg-[var(--status-liberado-bg)] text-[var(--status-liberado-fg)]",
};

export function LeadCard({ lead, onSelect, onChangeStatus, onRenew, onGenerateReferral }: Props) {
  const [busy, setBusy] = useState(false);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied">("idle");

  const a = lead.assignment;
  const accent = a ? STATUS_ACCENT[a.status] : "var(--border-strong)";

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

  async function handleSaleSubmit(sale: SaleFormInput) {
    await onChangeStatus("vendido", sale);
    setShowSaleForm(false);
  }

  async function handleRenew() {
    setBusy(true);
    setError(null);
    try {
      await onRenew();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function handleCopyReferral() {
    setCopyState("copying");
    setError(null);
    try {
      const url = await onGenerateReferral();
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setCopyState("idle");
    }
  }

  return (
    <div
      className="surface-card surface-card--interactive animate-enter relative overflow-hidden p-4"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-[var(--foreground)]">{lead.nombre}</h3>
          <p className="text-[13px] text-[var(--foreground-faint)]">{lead.tipoNegocio}</p>
        </div>
        {a && (
          <span className={`badge shrink-0 ${STATUS_BADGE_CLASS[a.status]}`}>
            {STATUS_LABELS[a.status]}
          </span>
        )}
      </div>

      <div className="mt-3.5 space-y-1.5 text-[13.5px] text-[var(--foreground-muted)]">
        {lead.direccion && (
          <p className="flex items-start gap-1.5">
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--foreground-faint)]">
              <path d="M8 14.5s5-4.2 5-8.2a5 5 0 0 0-10 0c0 4 5 8.2 5 8.2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              <circle cx="8" cy="6.3" r="1.7" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            <span className="min-w-0">{lead.direccion}</span>
          </p>
        )}
        {lead.telefono && (
          <p className="flex items-center gap-1.5">
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0 text-[var(--foreground-faint)]">
              <path d="M3.5 2.5h2.2l1 3-1.5 1.2a8 8 0 0 0 4 4l1.2-1.5 3 1v2.2c0 .7-.6 1.2-1.2 1.1-5.6-.6-9.9-4.9-10.5-10.5-.1-.6.4-1.2 1.1-1.2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
            <span className="font-data">{lead.telefono}</span>
          </p>
        )}
        {lead.email && (
          <p className="flex items-center gap-1.5">
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0 text-[var(--foreground-faint)]">
              <path d="M2.5 4.5h11v7a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-7Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M2.7 4.8 8 9l5.3-4.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="truncate">{lead.email}</span>
          </p>
        )}
        {lead.web && (
          <p className="flex items-center gap-1.5">
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0 text-[var(--foreground-faint)]">
              <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M2.5 8h11M8 2.5c1.4 1.6 2.2 3.5 2.2 5.5s-.8 3.9-2.2 5.5c-1.4-1.6-2.2-3.5-2.2-5.5S6.6 4.1 8 2.5Z" stroke="currentColor" strokeWidth="1.1" />
            </svg>
            <a
              href={lead.web}
              target="_blank"
              rel="noreferrer"
              className="truncate text-[var(--brand)] transition-colors hover:text-[var(--brand-hover)] hover:underline"
            >
              {lead.web.replace(/^https?:\/\//, "")}
            </a>
          </p>
        )}
      </div>

      {lead.notas && (
        <p className="mt-3 line-clamp-3 rounded-[var(--radius-sm)] bg-[var(--surface-sunken)] px-2.5 py-2 text-[12.5px] leading-relaxed text-[var(--foreground-muted)]">
          {lead.notas}
        </p>
      )}

      {error && (
        <p className="mt-2.5 flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-2.5 py-1.5 text-[12.5px] font-medium text-[var(--danger)]">
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          {error}
        </p>
      )}

      <div className="mt-4">
        {!a && (
          <button onClick={handleSelect} disabled={busy} className="btn btn-primary w-full py-2.5">
            {busy && <span className="h-3.5 w-3.5 animate-spin-slow rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />}
            {busy ? "Asignando…" : "Seleccionar lead"}
          </button>
        )}

        {a && !a.assignedToMe && (
          <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[var(--surface-sunken)] px-3 py-2.5">
            <p className="min-w-0 text-[13px] text-[var(--foreground-muted)]">
              Asignado a{" "}
              <span className="font-semibold text-[var(--foreground)]">{a.assignedToName}</span>
            </p>
            <CountdownRing expiresAt={a.expiresAt} size={34} />
          </div>
        )}

        {a && a.assignedToMe && a.status !== "vendido" && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--brand-tint-strong)] bg-[var(--brand-tint)] px-3 py-2">
              <p className="text-[12.5px] font-medium text-[var(--brand-active)]">
                Tuyo mientras dure la exclusividad
                {a.renewalCount > 0 && (
                  <span className="ml-1.5 font-data text-[11px] font-normal text-[var(--brand)]">
                    · renovado {a.renewalCount}×
                  </span>
                )}
              </p>
              <CountdownRing expiresAt={a.expiresAt} size={32} />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleRenew}
                disabled={busy}
                title="Amplía la exclusividad 72h más — úsalo cuando el cliente siga interesado y necesites más tiempo"
                className="btn btn-secondary flex-1 py-2 text-[13px]"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                  <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3.2h-3.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Renovar (+72h)
              </button>
              <button
                onClick={handleCopyReferral}
                disabled={copyState === "copying"}
                title="Genera y copia tu enlace de referido para que la venta te quede atribuida aunque el lead se libere después"
                className={`btn flex-1 py-2 text-[13px] transition-colors ${
                  copyState === "copied" ? "btn-success" : "btn-secondary"
                }`}
              >
                {copyState === "copied" ? (
                  <>
                    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                      <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Copiado
                  </>
                ) : (
                  <>
                    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                      <rect x="5.5" y="5.5" width="8" height="8" rx="1.3" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M3 10.5V3.8A1.3 1.3 0 0 1 4.3 2.5h6.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    {copyState === "copying" ? "Generando…" : "Copiar enlace"}
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {a.status === "asignado" && (
                <button
                  onClick={() => handleStatus("contactado")}
                  disabled={busy}
                  className="btn btn-secondary flex-1 py-2 text-[13px]"
                >
                  Marcar contactado
                </button>
              )}
              {(a.status === "asignado" || a.status === "contactado") && (
                <button
                  onClick={() => handleStatus("interesado")}
                  disabled={busy}
                  className="btn btn-secondary flex-1 py-2 text-[13px]"
                >
                  Marcar interesado
                </button>
              )}
              <button
                onClick={() => setShowSaleForm(true)}
                disabled={busy}
                className="btn btn-success w-full py-2.5"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                  <path d="M8 2v12M4.5 5.2c0-1.2 1.4-2.2 3.5-2.2s3.5 1 3.5 2.2-1.4 1.8-3.5 1.8-3.5.7-3.5 1.9S6.9 11 9 11s3.5-.8 3.5-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                Registrar venta
              </button>
              <button
                onClick={() => {
                  if (confirm(`¿Liberar a ${lead.nombre}? Volverá a la lista de disponibles para cualquier vendedor.`)) {
                    handleStatus("liberado");
                  }
                }}
                disabled={busy}
                className="btn btn-danger-outline w-full py-1.5 text-[12.5px]"
              >
                Liberar lead
              </button>
            </div>
          </div>
        )}

        {a && a.status === "vendido" && a.sale && (
          <div className="space-y-1 rounded-[var(--radius-md)] border border-[var(--status-vendido)]/20 bg-[var(--status-vendido-bg)] px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--status-vendido-fg)]">
              <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M5.3 8.2 7.2 10l3.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Vendido
            </p>
            <p className="font-data text-lg font-bold text-[var(--status-vendido-fg)]">
              {a.sale.importe.toFixed(2)} {a.sale.moneda}
            </p>
            <p className="font-data text-[12px] font-medium text-[var(--brand-active)]">
              Tu comisión: {a.sale.comisionImporte.toFixed(2)} {a.sale.moneda}{" "}
              <span className="font-sans font-normal text-[var(--foreground-faint)]">
                ({a.sale.comisionPorcentaje}%)
              </span>
            </p>
            <p className="font-data text-[11.5px] text-[var(--foreground-faint)]">
              Ref: {a.sale.referenciaPago}
            </p>
            <p className="text-[11.5px] text-[var(--foreground-faint)]">
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
