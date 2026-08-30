"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth-context";

const ADMIN_NAV = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/ventas", label: "Ventas y comisiones" },
  { href: "/admin/ajustes", label: "Ajustes" },
];

/**
 * Protección de CLIENTE únicamente — evita que alguien sin rol admin vea
 * parpadear la UI del panel antes de ser redirigido. Esto NO es la
 * protección real: cada endpoint que este panel llama exige requireAdmin
 * en servidor (ver src/lib/auth-server.ts) y rechaza la petición
 * independientemente de lo que muestre o deje de mostrar esta capa visual.
 * Un usuario que manipule el frontend para saltarse esta redirección
 * seguiría recibiendo 403 de cada API real.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (profile && profile.role !== "admin") {
      router.push("/");
    }
  }, [user, profile, loading, router]);

  if (loading || !user || !profile || profile.role !== "admin") {
    return (
      <>
        <Header />
        <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-20">
          <span
            className="h-6 w-6 animate-spin-slow rounded-full border-2 border-[var(--brand)] border-t-transparent"
            aria-hidden="true"
          />
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-4 py-8 sm:px-6">
        <nav className="hidden w-48 shrink-0 sm:block">
          <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wide text-[var(--foreground-faint)]">
            Administración
          </p>
          <ul className="space-y-0.5">
            {ADMIN_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-[var(--radius-sm)] px-2.5 py-2 text-[13.5px] font-medium text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--foreground)]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Nav horizontal en móvil, ya que el sidebar se oculta */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-[var(--border)] bg-[var(--surface)]/95 px-2 py-1.5 backdrop-blur-md sm:hidden">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-[var(--radius-sm)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-sunken)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="min-w-0 flex-1 pb-16 sm:pb-0">{children}</main>
      </div>
    </>
  );
}
