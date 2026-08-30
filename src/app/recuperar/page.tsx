"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { translateAuthError } from "@/lib/auth-errors";
import { APP_NAME } from "@/lib/brand";

export default function RecuperarPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Escribe tu correo electrónico.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(email.trim());
      // Se muestra éxito incluso si Firebase internamente no encontró la
      // cuenta (comportamiento de seguridad estándar: no revelar si un
      // correo está o no registrado evita que alguien use este formulario
      // para comprobar qué emails existen en la plataforma).
      setSent(true);
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-7 flex flex-col items-center gap-3">
        <Image src="/icons/icon-192.png" alt="" width={56} height={56} className="rounded-2xl" />
        <p className="text-lg font-bold tracking-tight text-[var(--foreground)]">{APP_NAME}</p>
      </Link>

      <div className="surface-card w-full max-w-sm p-6 sm:p-7">
        {sent ? (
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--status-vendido-bg)]">
              <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-5 w-5 text-[var(--status-vendido-fg)]">
                <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-[var(--foreground)]">Revisa tu correo</h1>
            <p className="mt-1.5 text-sm text-[var(--foreground-faint)]">
              Si existe una cuenta con <span className="font-medium text-[var(--foreground-muted)]">{email}</span>,
              te hemos enviado un enlace para restablecer tu contraseña.
            </p>
            <Link href="/login" className="btn btn-secondary mt-5 inline-flex px-4 py-2">
              Volver a iniciar sesión
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mb-1.5 text-center text-lg font-semibold text-[var(--foreground)]">
              Recupera tu contraseña
            </h1>
            <p className="mb-5 text-center text-[13px] text-[var(--foreground-faint)]">
              Te enviaremos un enlace a tu correo para crear una nueva.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[var(--foreground)]">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  className="field"
                  autoComplete="email"
                  disabled={submitting}
                  required
                />
              </div>

              {error && (
                <p className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-2.5 py-1.5 text-[12.5px] font-medium text-[var(--danger)]">
                  <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  {error}
                </p>
              )}

              <button type="submit" disabled={submitting} className="btn btn-primary w-full py-2.5">
                {submitting && (
                  <span className="h-3.5 w-3.5 animate-spin-slow rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                )}
                {submitting ? "Enviando…" : "Enviar enlace"}
              </button>
            </form>

            <p className="mt-5 text-center text-[13px] text-[var(--foreground-faint)]">
              <Link href="/login" className="font-medium text-[var(--brand)] hover:underline">
                Volver a iniciar sesión
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
