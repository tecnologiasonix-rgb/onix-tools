"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";

type RankingEntry = {
  userId: string;
  userName: string;
  comision: number;
  ventas: number;
  position: number;
};

type MuroEntry = {
  userName: string;
  productName: string;
  comisionImporte: number;
  fechaHoraPago: string;
};

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function RankingPage() {
  const { user, loading: authLoading, getToken } = useAuth();
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [muro, setMuro] = useState<MuroEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      setError(null);
      try {
        const token = await getToken();
        const res = await apiFetch("/api/ranking", token);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error al cargar el ranking");
        setRanking(data.ranking ?? []);
        setMuro(data.muro ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar el ranking");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading, getToken]);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
          Ranking de vendedores
        </h1>
        <p className="mt-1.5 text-sm text-[var(--foreground-muted)]">
          Top {ranking.length > 0 ? "50" : ""} por comisión acumulada, visible para todo el equipo.
        </p>

        {loading || authLoading ? (
          <div className="mt-16 flex justify-center">
            <span className="h-6 w-6 animate-spin-slow rounded-full border-2 border-[var(--brand)] border-t-transparent" aria-hidden="true" />
          </div>
        ) : error ? (
          <p className="mt-6 flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-2.5 py-1.5 text-[12.5px] font-medium text-[var(--danger)]">
            {error}
          </p>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <div className="space-y-1.5">
                {ranking.map((entry) => {
                  const isSelf = entry.userId === user?.uid;
                  return (
                    <div
                      key={entry.userId}
                      className={`surface-card flex items-center gap-3 p-3 ${
                        isSelf ? "ring-2 ring-[var(--brand)] ring-offset-1" : ""
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center font-data text-[13px] font-bold text-[var(--foreground-faint)]">
                        {MEDAL[entry.position] ?? entry.position}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-[var(--foreground)]">
                          {entry.userName}
                          {isSelf && (
                            <span className="ml-1.5 text-[12px] font-normal text-[var(--brand)]">(tú)</span>
                          )}
                        </p>
                        <p className="text-[12px] text-[var(--foreground-faint)]">
                          {entry.ventas} venta{entry.ventas === 1 ? "" : "s"}
                        </p>
                      </div>
                      <p className="font-data shrink-0 text-[15px] font-bold text-[var(--status-vendido-fg)]">
                        {entry.comision.toFixed(2)} €
                      </p>
                    </div>
                  );
                })}

                {ranking.length === 0 && (
                  <p className="surface-card py-10 text-center text-sm text-[var(--foreground-faint)]">
                    Todavía no hay ventas registradas. ¡Sé el primero!
                  </p>
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
              <h2 className="mb-2 text-sm font-semibold text-[var(--foreground)]">
                Ventas recientes
              </h2>
              <div className="space-y-1.5">
                {muro.map((v, i) => (
                  <div key={i} className="surface-card p-3">
                    <p className="text-[13px] font-medium text-[var(--foreground)]">
                      {v.userName}{" "}
                      <span className="font-normal text-[var(--foreground-faint)]">
                        vendió {v.productName}
                      </span>
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-[11.5px] text-[var(--foreground-faint)]">
                        {new Date(v.fechaHoraPago).toLocaleDateString("es-ES")}
                      </p>
                      <p className="font-data text-[12.5px] font-semibold text-[var(--status-vendido-fg)]">
                        +{v.comisionImporte.toFixed(2)} €
                      </p>
                    </div>
                  </div>
                ))}

                {muro.length === 0 && (
                  <p className="surface-card py-8 text-center text-[12.5px] text-[var(--foreground-faint)]">
                    Sin ventas todavía.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
