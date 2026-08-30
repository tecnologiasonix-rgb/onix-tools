"use client";

import { useEffect, useState } from "react";

const ASSIGNMENT_WINDOW_MS = 72 * 60 * 60 * 1000;
const TICK_MS = 30_000;

type Props = {
  expiresAt: string;
  /** Tamaño del anillo en px. Por defecto 40. */
  size?: number;
};

type Urgency = "low" | "mid" | "high" | "expired";

function getRemaining(expiresAt: string) {
  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  const fraction = Math.min(1, Math.max(0, remainingMs / ASSIGNMENT_WINDOW_MS));
  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  let urgency: Urgency = "low";
  if (remainingMs <= 0) urgency = "expired";
  else if (remainingMs <= 6 * 60 * 60 * 1000) urgency = "high";
  else if (remainingMs <= 24 * 60 * 60 * 1000) urgency = "mid";
  return { remainingMs, fraction, hours, mins, urgency };
}

const URGENCY_COLOR: Record<Urgency, string> = {
  low: "var(--urgency-low)",
  mid: "var(--urgency-mid)",
  high: "var(--urgency-high)",
  expired: "var(--foreground-faint)",
};

/**
 * Anillo de cuenta atrás para la ventana de exclusividad de 72h de un lead.
 * Se vacía en tiempo real (un tick cada 30s es de sobra para una ventana de
 * 72h) y cambia de color según la urgencia real del negocio, no como adorno.
 *
 * getRemaining() depende de Date.now(), que difiere entre el instante del
 * render de servidor (SSR) y el de la hidratación en cliente. Para evitar
 * un hydration mismatch, el render inicial (servidor y primera pintura de
 * cliente) muestra un estado neutro fijo; el valor real dependiente del
 * reloj se calcula solo tras montar, siguiendo el patrón "mounted flag"
 * documentado por React para este caso exacto de contenido dependiente de
 * fuentes externas al propio render (ver react.dev/link/hydration-mismatch
 * y next-themes' "avoid hydration mismatch"). El `setTimeout` con delay 0
 * — en vez de una llamada directa en el cuerpo del efecto — asegura que
 * este primer setState corre en una macrotarea aparte, no de forma
 * síncrona durante el commit del efecto.
 */
export function CountdownRing({ expiresAt, size = 40 }: Props) {
  const [mounted, setMounted] = useState(false);
  const [remaining, setRemaining] = useState<ReturnType<typeof getRemaining> | null>(null);

  useEffect(() => {
    const syncNow = () => {
      setMounted(true);
      setRemaining(getRemaining(expiresAt));
    };
    const initialSync = setTimeout(syncNow, 0);
    const id = setInterval(syncNow, TICK_MS);
    return () => {
      clearTimeout(initialSync);
      clearInterval(id);
    };
  }, [expiresAt]);

  const isNeutral = !mounted || !remaining;
  const fraction = isNeutral ? 1 : remaining.fraction;
  const urgency: Urgency = isNeutral ? "low" : remaining.urgency;

  const stroke = Math.max(2.5, size * 0.09);
  const radius = size / 2 - stroke;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - fraction);
  const color = URGENCY_COLOR[urgency];

  const label = isNeutral
    ? ""
    : remaining.urgency === "expired"
      ? "Expirado"
      : remaining.hours > 0
        ? `${remaining.hours}h`
        : `${remaining.mins}m`;

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={
        isNeutral
          ? "Calculando tiempo restante de exclusividad"
          : remaining.urgency === "expired"
            ? "Ventana de exclusividad expirada"
            : `${remaining.hours}h ${remaining.mins}m restantes de exclusividad`
      }
      title={
        isNeutral
          ? undefined
          : remaining.urgency === "expired"
            ? "Ventana de exclusividad expirada"
            : `${remaining.hours}h ${remaining.mins}m restantes`
      }
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transition:
              "stroke-dashoffset 600ms cubic-bezier(0.4,0,0.2,1), stroke 400ms ease",
          }}
        />
      </svg>
      <span
        className="font-data absolute inset-0 flex items-center justify-center leading-none"
        style={{
          fontSize: size * 0.26,
          fontWeight: 700,
          color: urgency === "expired" ? "var(--foreground-faint)" : "var(--foreground)",
        }}
      >
        {label}
      </span>
    </div>
  );
}
