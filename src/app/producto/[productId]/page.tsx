"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { LeadCard } from "@/components/LeadCard";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { EnrichedLead, LeadStatus } from "@/lib/types";
import { SaleFormInput } from "@/components/SaleForm";

type Filter = "todos" | "disponibles" | "mios";
type WebFilter = "todos" | "con_web" | "sin_web";

const FILTER_LABELS: Record<Filter, string> = {
  disponibles: "Disponibles",
  mios: "Mis leads",
  todos: "Todos",
};

const WEB_FILTER_LABELS: Record<WebFilter, string> = {
  todos: "Con o sin web",
  con_web: "Con web",
  sin_web: "Sin web",
};

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  labels,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
  labels: Record<T, string>;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-1">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`relative whitespace-nowrap rounded-[calc(var(--radius-md)-4px)] px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
              active
                ? "bg-[var(--ink)] text-white shadow-sm"
                : "text-[var(--foreground-faint)] hover:text-[var(--foreground)]"
            }`}
          >
            {labels[opt]}
          </button>
        );
      })}
    </div>
  );
}

export default function ProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = use(params);
  const { user, loading: authLoading, getToken } = useAuth();
  const router = useRouter();

  const [productName, setProductName] = useState<string>("");
  const [leads, setLeads] = useState<EnrichedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("disponibles");
  const [webFilter, setWebFilter] = useState<WebFilter>("todos");
  const [search, setSearch] = useState("");
  // Metadata de la ventana progresiva: cuántos disponibles hay en TOTAL en
  // el sistema (miles, potencialmente) frente a cuántos puede ver este
  // vendedor ahora mismo. Se muestra para que "solo veo 20" tenga una
  // explicación clara en vez de parecer un error o un límite arbitrario.
  const [totalAvailableInSystem, setTotalAvailableInSystem] = useState(0);
  const [visibleLeadsWindow, setVisibleLeadsWindow] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await apiFetch(`/api/leads?productId=${productId}`, token);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cargar leads");
      setProductName(data.product.name);
      setLeads(data.leads);
      setTotalAvailableInSystem(data.totalAvailableInSystem ?? 0);
      setVisibleLeadsWindow(data.visibleLeadsWindow ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar leads");
    } finally {
      setLoading(false);
    }
  }, [productId, getToken]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/");
      return;
    }
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [user, authLoading, router, load]);

  async function handleSelect(leadId: string) {
    const token = await getToken();
    const res = await apiFetch("/api/leads/select", token, {
      method: "POST",
      body: JSON.stringify({ productId, leadId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error al seleccionar lead");
    await load();
  }

  async function handleChangeStatus(leadId: string, status: LeadStatus, sale?: SaleFormInput) {
    const token = await getToken();
    const res = await apiFetch("/api/leads/status", token, {
      method: "POST",
      body: JSON.stringify({ productId, leadId, status, sale }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error al actualizar estado");
    await load();
  }

  async function handleRenew(leadId: string) {
    const token = await getToken();
    const res = await apiFetch("/api/leads/renew", token, {
      method: "POST",
      body: JSON.stringify({ productId, leadId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error al renovar seguimiento");
    await load();
  }

  async function handleGenerateReferral(leadId: string): Promise<string> {
    const token = await getToken();
    const res = await apiFetch("/api/leads/generate-referral", token, {
      method: "POST",
      body: JSON.stringify({ productId, leadId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error al generar el enlace");
    // A diferencia de los demás handlers, no se llama a load(): generar un
    // referido no cambia ningún dato visible en la ficha del lead (no toca
    // status, expiresAt ni sale), así que recargar todo el listado sería
    // trabajo innecesario.
    return data.url as string;
  }

  const filtered = leads.filter((lead) => {
    if (filter === "disponibles" && lead.assignment) return false;
    if (filter === "mios" && !lead.assignment?.assignedToMe) return false;
    const hasWeb = lead.web.trim().length > 0;
    if (webFilter === "con_web" && !hasWeb) return false;
    if (webFilter === "sin_web" && hasWeb) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const haystack = `${lead.nombre} ${lead.tipoNegocio} ${lead.direccion}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const disponibles = leads.filter((l) => !l.assignment).length;
  const mios = leads.filter((l) => l.assignment?.assignedToMe).length;

  if (authLoading || !user) return null;

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
              {productName || (
                <span className="skeleton inline-block h-6 w-40 align-middle" />
              )}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--foreground-faint)]">
              <span className="font-data">{leads.length} leads en total</span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-asignado)]" aria-hidden="true" />
                <span className="font-data">{disponibles}</span> disponibles
              </span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)]" aria-hidden="true" />
                <span className="font-data">{mios}</span> tuyos
              </span>
              {totalAvailableInSystem > visibleLeadsWindow && (
                <>
                  <span aria-hidden="true">·</span>
                  <span
                    className="flex items-center gap-1 text-[var(--foreground-faint)]"
                    title="A medida que trabajes tus leads actuales, verás más de la cola."
                  >
                    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    mostrando <span className="font-data">{visibleLeadsWindow}</span> de{" "}
                    <span className="font-data">{totalAvailableInSystem}</span> en cola
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2.5">
          <SegmentedControl
            value={filter}
            onChange={setFilter}
            options={["disponibles", "mios", "todos"] as const}
            labels={FILTER_LABELS}
          />
          <SegmentedControl
            value={webFilter}
            onChange={setWebFilter}
            options={["todos", "con_web", "sin_web"] as const}
            labels={WEB_FILTER_LABELS}
          />

          <div className="relative min-w-[200px] flex-1">
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-faint)]"
            >
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre, tipo o dirección…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="field pl-9"
            />
          </div>
        </div>

        {error && (
          <p className="animate-enter mb-5 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3.5 py-2.5 text-sm font-medium text-[var(--danger)]">
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            {error}
          </p>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="surface-card space-y-3 p-4">
                <div className="skeleton h-4 w-2/3" />
                <div className="skeleton h-3 w-1/3" />
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-4/5" />
                <div className="skeleton h-9 w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="animate-enter flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] py-16 text-center">
            <svg aria-hidden="true" viewBox="0 0 40 40" fill="none" className="h-9 w-9 text-[var(--foreground-faint)]">
              <circle cx="20" cy="20" r="15" stroke="currentColor" strokeWidth="1.5" />
              <path d="M25 25 32 32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="font-medium text-[var(--foreground-muted)]">
              No hay leads que coincidan con este filtro
            </p>
            <p className="text-sm text-[var(--foreground-faint)]">
              Prueba a cambiar los filtros o la búsqueda.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((lead) => (
              <LeadCard
                key={lead.leadId}
                lead={lead}
                onSelect={() => handleSelect(lead.leadId)}
                onChangeStatus={(status, sale) => handleChangeStatus(lead.leadId, status, sale)}
                onRenew={() => handleRenew(lead.leadId)}
                onGenerateReferral={() => handleGenerateReferral(lead.leadId)}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
