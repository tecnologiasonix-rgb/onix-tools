"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";

export default function AjustesPage() {
  const { user, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
          Ajustes
        </h1>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
          Preferencias de tu cuenta.
        </p>

        <div className="surface-card mt-6 p-5">
          <p className="mb-1.5 text-[13px] font-medium text-[var(--foreground)]">
            Apariencia
          </p>
          <p className="mb-3.5 text-[12.5px] leading-relaxed text-[var(--foreground-faint)]">
            Elige cómo se ve OnixWork en este dispositivo.
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => setTheme("dark")}
              className={`flex-1 rounded-[var(--radius-md)] border p-3 text-left transition-colors ${
                theme === "dark"
                  ? "border-[var(--brand)] bg-[var(--brand-tint)]"
                  : "border-[var(--border-strong)] bg-[var(--surface)] hover:bg-[var(--surface-sunken)]"
              }`}
            >
              <div className="mb-2 flex h-10 items-center justify-center rounded-[var(--radius-sm)] bg-[#0b0e14]">
                <span className="h-2 w-2 rounded-full bg-[#3d8bff]" aria-hidden="true" />
              </div>
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--foreground)]">
                {theme === "dark" && (
                  <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-[var(--brand)]">
                    <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                Oscuro
              </p>
              <p className="text-[11.5px] text-[var(--foreground-faint)]">Por defecto</p>
            </button>

            <button
              onClick={() => setTheme("light")}
              className={`flex-1 rounded-[var(--radius-md)] border p-3 text-left transition-colors ${
                theme === "light"
                  ? "border-[var(--brand)] bg-[var(--brand-tint)]"
                  : "border-[var(--border-strong)] bg-[var(--surface)] hover:bg-[var(--surface-sunken)]"
              }`}
            >
              <div className="mb-2 flex h-10 items-center justify-center rounded-[var(--radius-sm)] border border-[#e3e6ef] bg-[#f6f7fb]">
                <span className="h-2 w-2 rounded-full bg-[#1557f0]" aria-hidden="true" />
              </div>
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--foreground)]">
                {theme === "light" && (
                  <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-[var(--brand)]">
                    <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                Claro
              </p>
              <p className="text-[11.5px] text-[var(--foreground-faint)]">Legibilidad máxima</p>
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
