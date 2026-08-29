"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { LeadCard } from "@/components/LeadCard";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { EnrichedLead } from "@/lib/types";
import { LeadStatus, SaleInfo } from "@/lib/assignments";

type Filter = "todos" | "disponibles" | "mios";
type WebFilter = "todos" | "con_web" | "sin_web";

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

  async function handleChangeStatus(leadId: string, status: LeadStatus, sale?: SaleInfo) {
    const token = await getToken();
    const res = await apiFetch("/api/leads/status", token, {
      method: "POST",
      body: JSON.stringify({ productId, leadId, status, sale }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error al actualizar estado");
    await load();
  }

  const filtered = leads.filter((lead) => {
    if (filter === "disponibles" && lead.assignment) return false;
    if (filter === "mios" && !lead.assignment?.assignedToMe) return false;
    const hasWeb = lead.web.trim().length > 0;
    if (webFilter === "con_web" && !hasWeb) return false;
    if (webFilter === "sin_web" && hasWeb) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const haystack = `${lead.nombre} ${lead.tipo} ${lead.direccion}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  if (authLoading || !user) return null;

  return (
    <>
      <Header />
      <main className="flex-1 mx-auto max-w-5xl w-full px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">{productName || "Cargando…"}</h1>
          <p className="text-sm text-neutral-500">{leads.length} leads en total</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex gap-1 bg-neutral-100 rounded-md p-1">
            {(["disponibles", "mios", "todos"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-sm px-3 py-1.5 rounded ${
                  filter === f ? "bg-white shadow-sm font-medium" : "text-neutral-500"
                }`}
              >
                {f === "disponibles" ? "Disponibles" : f === "mios" ? "Mis leads" : "Todos"}
              </button>
            ))}
          </div>

          <div className="flex gap-1 bg-neutral-100 rounded-md p-1">
            {(["todos", "con_web", "sin_web"] as WebFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setWebFilter(f)}
                className={`text-sm px-3 py-1.5 rounded whitespace-nowrap ${
                  webFilter === f ? "bg-white shadow-sm font-medium" : "text-neutral-500"
                }`}
              >
                {f === "todos" ? "Con o sin web" : f === "con_web" ? "Con web" : "Sin web"}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Buscar por nombre, tipo o dirección…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 mb-4 bg-red-50 rounded-md px-3 py-2">{error}</p>
        )}

        {loading ? (
          <p className="text-neutral-400">Cargando leads…</p>
        ) : filtered.length === 0 ? (
          <p className="text-neutral-400">No hay leads que coincidan con este filtro.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((lead) => (
              <LeadCard
                key={lead.leadId}
                lead={lead}
                onSelect={() => handleSelect(lead.leadId)}
                onChangeStatus={(status, sale) => handleChangeStatus(lead.leadId, status, sale)}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
