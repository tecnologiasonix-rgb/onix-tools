"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { translateAuthError } from "@/lib/auth-errors";

type Mode = "login" | "registro";

type Props = {
  mode: Mode;
  onSuccess: () => void;
};

export function AuthForm({ mode, onSuccess }: Props) {
  const { signInWithGoogle, registerWithEmail, signInWithEmail } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "registro" && displayName.trim().length < 2) {
      setError("Escribe tu nombre completo.");
      return;
    }
    if (!email.trim()) {
      setError("Escribe tu correo electrónico.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "registro") {
        await registerWithEmail(email.trim(), password, displayName.trim());
      } else {
        await signInWithEmail(email.trim(), password);
      }
      onSuccess();
    } catch (err) {
      setError(translateAuthError(err));
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setGoogleSubmitting(true);
    try {
      await signInWithGoogle();
      onSuccess();
    } catch (err) {
      setError(translateAuthError(err));
      setGoogleSubmitting(false);
    }
  }

  const busy = submitting || googleSubmitting;

  return (
    <div className="w-full max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "registro" && (
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--foreground)]">
              Nombre completo
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Tu nombre y apellidos"
              className="field"
              autoComplete="name"
              disabled={busy}
              required
            />
          </div>
        )}

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
            disabled={busy}
            required
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-[13px] font-medium text-[var(--foreground)]">
              Contraseña
            </label>
            {mode === "login" && (
              <Link
                href="/recuperar"
                className="text-[12.5px] font-medium text-[var(--brand)] hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            )}
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "registro" ? "Mínimo 6 caracteres" : "Tu contraseña"}
            className="field"
            autoComplete={mode === "registro" ? "new-password" : "current-password"}
            disabled={busy}
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

        <button type="submit" disabled={busy} className="btn btn-primary w-full py-2.5">
          {submitting && (
            <span
              className="h-3.5 w-3.5 animate-spin-slow rounded-full border-2 border-white/40 border-t-white"
              aria-hidden="true"
            />
          )}
          {submitting
            ? "Un momento…"
            : mode === "registro"
              ? "Crear cuenta"
              : "Iniciar sesión"}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--border)]" />
        <span className="text-[12px] font-medium text-[var(--foreground-faint)]">o</span>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={busy}
        className="btn btn-secondary flex w-full items-center justify-center gap-2 py-2.5"
      >
        {googleSubmitting ? (
          <span
            className="h-3.5 w-3.5 animate-spin-slow rounded-full border-2 border-[var(--border-strong)] border-t-[var(--foreground)]"
            aria-hidden="true"
          />
        ) : (
          <svg viewBox="0 0 18 18" className="h-4 w-4" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.87-3.04.87-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
            <path fill="#FBBC05" d="M3.97 10.73A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.19.28-1.73V4.94H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.06l3.01-2.33Z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
          </svg>
        )}
        Continuar con Google
      </button>

      <p className="mt-5 text-center text-[13px] text-[var(--foreground-faint)]">
        {mode === "registro" ? (
          <>
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-medium text-[var(--brand)] hover:underline">
              Inicia sesión
            </Link>
          </>
        ) : (
          <>
            ¿Aún no tienes cuenta?{" "}
            <Link href="/registro" className="font-medium text-[var(--brand)] hover:underline">
              Regístrate
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
