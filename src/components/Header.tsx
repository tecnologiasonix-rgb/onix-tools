"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function Header() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg tracking-tight">
          Gestor de Leads
        </Link>

        <div className="flex items-center gap-4">
          {!loading && user && (
            <Link
              href="/mis-leads"
              className="text-sm text-neutral-600 hover:text-neutral-900"
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
