"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { PRODUCTS } from "@/lib/products";

export default function HomePage() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
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
      <main className="flex-1 mx-auto max-w-3xl w-full px-4 py-12">
        {authLoading ? (
          <p className="text-neutral-400">Cargando…</p>
        ) : !user ? (
          <div className="text-center py-16">
            <h1 className="text-2xl font-semibold mb-2">Gestor de Leads</h1>
            <p className="text-neutral-500 mb-6">
              Inicia sesión con tu cuenta de Google para ver y gestionar los leads.
            </p>
            <button
              onClick={() => signInWithGoogle()}
              className="text-sm bg-neutral-900 text-white rounded-md px-5 py-2.5 hover:bg-neutral-700"
            >
              Entrar con Google
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold mb-1">Elige un producto</h1>
            <p className="text-sm text-neutral-500 mb-6">
              Cada producto tiene su propia lista de leads.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {PRODUCTS.map((p) => (
                <Link
                  key={p.id}
                  href={`/producto/${p.id}`}
                  className="border border-neutral-200 rounded-lg p-5 bg-white hover:border-neutral-400 hover:shadow-sm transition"
                >
                  <h2 className="font-medium mb-1">{p.name}</h2>
                  <p className="text-sm text-neutral-500">{p.description}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
