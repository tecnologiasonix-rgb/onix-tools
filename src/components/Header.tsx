"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { PRODUCTS } from "@/lib/products";
import { APP_NAME } from "@/lib/brand";

export function Header() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  // En /producto/[productId] este param existe; en el resto de rutas es undefined.
  const params = useParams<{ productId?: string }>();
  const activeProductId = params?.productId;

  function handleProductChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    if (id) router.push(`/producto/${id}`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--surface)]/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-none"
          >
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--ink)] shadow-sm ring-1 ring-black/5 transition-transform duration-200 group-hover:scale-105 sm:h-10 sm:w-10">
              <Image
                src="/icons/onix-logo.webp"
                alt="Tecnologías Onix"
                fill
                sizes="40px"
                className="object-cover"
                priority
              />
            </span>
            <span className="hidden flex-col leading-none sm:flex">
              <span className="text-[15px] font-bold tracking-tight text-[var(--foreground)]">
                {APP_NAME}
              </span>
              <span className="text-[11px] font-medium text-[var(--foreground-faint)]">
                Tecnologías Onix
              </span>
            </span>
          </Link>

          {!loading && user && PRODUCTS.length > 0 && (
            <div className="relative min-w-0">
              <select
                value={activeProductId ?? ""}
                onChange={handleProductChange}
                aria-label="Cambiar de producto"
                className="field h-9 max-w-[150px] cursor-pointer appearance-none truncate py-0 pr-8 text-[13px] font-medium sm:max-w-[220px] sm:text-sm"
              >
                <option value="" disabled>
                  Elige un producto…
                </option>
                {PRODUCTS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-faint)]"
              >
                <path
                  d="M5 7.5L10 12.5L15 7.5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {!loading && user && (
            <Link href="/mis-leads" className="btn btn-ghost px-3 py-1.5 text-[13px] sm:text-sm">
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                <path
                  d="M6 4h8a1 1 0 0 1 1 1v11.5a.5.5 0 0 1-.74.44L10 14.5l-4.26 2.44A.5.5 0 0 1 5 16.5V5a1 1 0 0 1 1-1Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="hidden sm:inline">Mis leads</span>
            </Link>
          )}

          {!loading && user && (
            <details className="group relative">
              <summary className="btn btn-ghost list-none px-2.5 py-1.5 marker:content-none [&::-webkit-details-marker]:hidden">
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                  <circle cx="4.5" cy="10" r="1.3" fill="currentColor" />
                  <circle cx="10" cy="10" r="1.3" fill="currentColor" />
                  <circle cx="15.5" cy="10" r="1.3" fill="currentColor" />
                </svg>
              </summary>
              {/* Overlay invisible que cierra el menú al hacer clic fuera —
                  patrón estándar para <details> sin necesitar JS de estado. */}
              <div
                className="fixed inset-0 z-10 hidden group-open:block"
                onClick={(e) => {
                  const details = (e.currentTarget as HTMLElement).closest("details");
                  details?.removeAttribute("open");
                }}
              />
              <div className="animate-modal-in absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] py-1.5 shadow-[var(--shadow-lg)]">
                {profile?.role === "admin" && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-2.5 px-3.5 py-2 text-[13.5px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-sunken)]"
                  >
                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-[var(--foreground-faint)]">
                      <path d="M10 2 3.5 5v5c0 4 2.8 6.7 6.5 8 3.7-1.3 6.5-4 6.5-8V5L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    </svg>
                    Administración
                  </Link>
                )}
                <Link
                  href="/ranking"
                  className="flex items-center gap-2.5 px-3.5 py-2 text-[13.5px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-sunken)]"
                >
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-[var(--foreground-faint)]">
                    <path d="M6 17V9M10 17V4M14 17v-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  Ranking
                </Link>
                <Link
                  href="/ajustes"
                  className="flex items-center gap-2.5 px-3.5 py-2 text-[13.5px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-sunken)]"
                >
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-[var(--foreground-faint)]">
                    <circle cx="10" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.4 4.6l-1.4 1.4M6 12.6l-1.4 1.4M15.4 15.4l-1.4-1.4M6 7.4 4.6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Ajustes
                </Link>
              </div>
            </details>
          )}

          {loading ? (
            <div className="flex items-center gap-2 py-1.5 pl-1 pr-2 text-[var(--foreground-faint)]">
              <span
                className="h-3.5 w-3.5 animate-spin-slow rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
              <span className="text-[13px] font-medium">Cargando…</span>
            </div>
          ) : user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] py-1 pl-1 pr-3 sm:flex">
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt=""
                    className="h-6 w-6 rounded-full ring-1 ring-black/5"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand-tint)] text-[11px] font-bold text-[var(--brand)]">
                    {(user.displayName ?? user.email ?? "?").charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="max-w-[140px] truncate text-[13px] font-medium text-[var(--foreground-muted)]">
                  {user.displayName ?? user.email}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="btn btn-secondary px-3 py-1.5 text-[13px] sm:text-sm"
              >
                Salir
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn btn-brand px-4 py-2 text-[13px] sm:text-sm">
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
