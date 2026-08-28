"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { PRODUCTS } from "@/lib/products";

export default function HomePage() {
  const { user, loading, signInWithGoogle } = useAuth();

  return (
    <>
      <Header />
      <main className="flex-1 mx-auto max-w-5xl w-full px-4 py-10">
        {loading ? (
          <p className="text-neutral-400">Cargando…</p>
        ) : !user ? (
          <div className="max-w-sm mx-auto text-center mt-20 space-y-4">
            <h1 className="text-xl font-semibold">Gestor de Leads</h1>
            <p className="text-neutral-500 text-sm">
              Inicia sesión con tu cuenta de Google para ver los productos y
              gestionar tus leads.
            </p>
            <button
              onClick={() => signInWithGoogle()}
              className="bg-neutral-900 text-white rounded-md px-5 py-2.5 text-sm hover:bg-neutral-700"
            >
              Entrar con Google
            </button>
          </div>
        ) : (
          <div>
            <h1 className="text-xl font-semibold mb-1">Elige un producto</h1>
            <p className="text-neutral-500 text-sm mb-6">
              Cada producto tiene su propia lista de leads.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {PRODUCTS.map((p) => (
                <Link
                  key={p.id}
                  href={`/producto/${p.id}`}
                  className="block border border-neutral-200 rounded-lg p-5 bg-white hover:border-neutral-400 hover:shadow-sm transition"
                >
                  <h2 className="font-medium">{p.name}</h2>
                  <p className="text-sm text-neutral-500 mt-1">{p.description}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
