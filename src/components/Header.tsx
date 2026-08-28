"use client";

import Link from "next/link";
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
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/" className="font-semibold text-lg tracking-tight whitespace-nowrap">
            Gestor de Leads
          </Link>

          {!loading && user && (
            <select
              value={activeProductId ?? ""}
              onChange={handleProductChange}
              className="text-sm border border-neutral-300 rounded-md px-2 py-1.5 bg-white text-neutral-700 max-w-[200px] truncate"
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
          )}
        </div>

        <div className="flex items-center gap-4">
          {!loading && user && (
            <Link
              href="/mis-leads"
              className="text-sm text-neutral-600 hover:text-neutral-900 whitespace-nowrap"
            >
              Mis leads
            </Link>
          )}

          {loading ? (
            <span className="text-sm text-neutral-400">Cargando…</span>
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {user.photoURL && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt=""
                    className="w-7 h-7 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                )}
                <span className="text-sm text-neutral-700 hidden sm:inline">
                  {user.displayName ?? user.email}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="text-sm text-neutral-500 hover:text-neutral-900 border border-neutral-200 rounded-md px-3 py-1.5 hover:bg-neutral-50"
              >
                Salir
              </button>
            </div>
          ) : (
            <button
              onClick={() => signInWithGoogle()}
              className="text-sm bg-neutral-900 text-white rounded-md px-4 py-1.5 hover:bg-neutral-700"
            >
              Entrar con Google
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
