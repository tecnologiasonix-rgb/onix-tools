"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { PRODUCTS } from "@/lib/products";

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Si solo hay un producto, saltamos directo a su lista de leads.
  useEffect(() => {
    if (authLoading || !user) return;
    if (PRODUCTS.length === 1) {
      router.push(`/producto/${PRODUCTS[0].id}`);
    }
  }, [user, authLoading, router]);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        {authLoading ? (
          <div className="animate-enter mx-auto mt-16 flex max-w-xs flex-col items-center gap-3 text-center">
            <span
              className="h-6 w-6 animate-spin-slow rounded-full border-2 border-[var(--brand)] border-t-transparent"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-[var(--foreground-faint)]">Cargando tu sesión…</p>
          </div>
        ) : !user ? (
          <div className="animate-enter mx-auto flex max-w-lg flex-col items-center py-12 text-center sm:py-20">
            <span className="relative mb-6 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[var(--ink)] shadow-lg ring-1 ring-black/5 sm:h-24 sm:w-24">
              <Image
                src="/icons/onix-logo.webp"
                alt="Tecnologías Onix"
                fill
                sizes="96px"
                className="object-cover"
                priority
              />
            </span>

            <span className="badge mb-4 border border-[var(--brand-tint-strong)] bg-[var(--brand-tint)] text-[var(--brand-active)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)]" aria-hidden="true" />
              Herramienta interna
            </span>

            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
              Gestor de Leads
            </h1>
            <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-[var(--foreground-muted)]">
              Reparte, contacta y cierra leads en equipo. Cada lead queda a tu
              nombre 72 horas para que nadie más lo trabaje mientras tanto.
            </p>

            <p className="mt-8 text-sm text-[var(--foreground-faint)]">
              Inicia sesión con tu cuenta de Google desde la esquina superior
              derecha para continuar.
            </p>

            <div className="mt-10 grid w-full grid-cols-1 gap-3 text-left sm:grid-cols-3">
              {[
                {
                  title: "Exclusividad 72h",
                  desc: "Nadie más contacta un lead mientras lo tienes tú.",
                },
                {
                  title: "Ventas verificables",
                  desc: "Cada cierre queda con importe, referencia y fecha.",
                },
                {
                  title: "Todo en equipo",
                  desc: "Visibilidad compartida de quién lleva cada lead.",
                },
              ].map((item) => (
                <div key={item.title} className="surface-card p-4">
                  <p className="text-[13px] font-semibold text-[var(--foreground)]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-snug text-[var(--foreground-faint)]">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-enter">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">
              Bienvenido de nuevo
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
              Elige un producto
            </h1>
            <p className="mt-1.5 text-sm text-[var(--foreground-muted)]">
              Cada producto tiene su propia lista de leads independiente.
            </p>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {PRODUCTS.map((p) => (
                <Link
                  key={p.id}
                  href={`/producto/${p.id}`}
                  className="surface-card surface-card--interactive group flex items-start justify-between gap-3 p-5"
                >
                  <div className="min-w-0">
                    <h2 className="font-semibold text-[var(--foreground)]">{p.name}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--foreground-faint)]">
                      {p.description}
                    </p>
                  </div>
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-sunken)] text-[var(--foreground-faint)] transition-all duration-200 group-hover:bg-[var(--brand)] group-hover:text-white"
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5">
                      <path
                        d="M7.5 4.5L13 10l-5.5 5.5"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
