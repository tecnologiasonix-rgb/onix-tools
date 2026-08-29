"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { PRODUCTS } from "@/lib/products";

export function Header() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const router = useRouter();
  // En /producto/[productId] este param existe; en el resto de rutas es undefined.
  const params = useParams<{ productId?: string }>();
  const activeProductId = params?.productId;

  function handleProductChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    if (id) router.push(`/producto/${id}`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/85 backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
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
                Onix<span className="text-[var(--brand)]">Leads</span>
              </span>
              <span className="text-[11px] font-medium text-[var(--foreground-faint)]">
                Gestor de leads
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
            <button
              onClick={() => signInWithGoogle()}
              className="btn btn-brand px-4 py-2 text-[13px] sm:text-sm"
            >
              <svg aria-hidden="true" viewBox="0 0 18 18" className="h-4 w-4">
                <path
                  fill="#fff"
                  d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62Z"
                  opacity=".95"
                />
                <path
                  fill="#fff"
                  d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z"
                  opacity=".8"
                />
                <path
                  fill="#fff"
                  d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z"
                  opacity=".65"
                />
                <path
                  fill="#fff"
                  d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
                  opacity=".5"
                />
              </svg>
              Entrar con Google
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
