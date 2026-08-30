import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth-server";
import {
  assignmentDocId,
  AssignmentDoc,
  ASSIGNMENT_DURATION_MS,
  isAssignmentActive,
} from "@/lib/types";

/**
 * "Renovar seguimiento" — botón separado e independiente del cambio de
 * estado (decisión de negocio confirmada explícitamente: NO se dispara
 * automáticamente al marcar "interesado", es una acción propia del
 * vendedor que puede repetirse).
 *
 * Extiende expiresAt a AHORA + 72h. No cambia el status de la asignación.
 * Solo funciona sobre asignaciones activas y propias — un lead ya expirado
 * o de otro vendedor no se puede "revivir" con esto.
 *
 * ANTIFRAUDE (preparado, no implementado aún): cada renovación queda en
 * renewalHistory con quién, cuándo, expiresAt anterior y nuevo — igual que
 * pide el documento de negocio. Añadir un máximo de renovaciones, exigir
 * status === "interesado", o requerir revisión admin es, a partir de esta
 * base, una condición más dentro de la misma transacción — no un cambio de
 * modelo de datos.
 */
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return authError(err);
  }

  const body = await req.json().catch(() => null);
  const productId = body?.productId as string | undefined;
  const leadId = body?.leadId as string | undefined;

  if (!productId || !leadId) {
    return NextResponse.json({ error: "Falta productId o leadId" }, { status: 400 });
  }

  const docId = assignmentDocId(productId as AssignmentDoc["productId"], leadId);
  const docRef = adminDb.collection("assignments").doc(docId);

  try {
    const result = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      if (!snap.exists) throw new Error("NOT_FOUND");
      const existing = snap.data() as AssignmentDoc;

      if (existing.userId !== user.uid) throw new Error("NOT_OWNER");
      if (!isAssignmentActive(existing)) throw new Error("EXPIRED");
      if (existing.status === "vendido") throw new Error("ALREADY_SOLD");

      const now = new Date();
      const previousExpiresAt = existing.expiresAt;
      const newExpiresAt = new Date(now.getTime() + ASSIGNMENT_DURATION_MS).toISOString();

      const updated: AssignmentDoc = {
        ...existing,
        expiresAt: newExpiresAt,
        renewalCount: existing.renewalCount + 1,
        renewalHistory: [
          ...existing.renewalHistory,
          { at: now.toISOString(), by: user.uid, previousExpiresAt, newExpiresAt },
        ],
        history: [
          ...existing.history,
          {
            status: "renovado",
            at: now.toISOString(),
            by: user.uid,
            byName: user.name,
          },
        ],
      };

      tx.set(docRef, updated);
      return updated;
    });

    return NextResponse.json({ assignment: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";

    if (message === "NOT_FOUND") {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });
    }
    if (message === "NOT_OWNER") {
      return NextResponse.json({ error: "Este lead no está asignado a ti" }, { status: 403 });
    }
    if (message === "EXPIRED") {
      return NextResponse.json(
        { error: "La asignación ya expiró, no se puede renovar. El lead ya no es tuyo." },
        { status: 410 }
      );
    }
    if (message === "ALREADY_SOLD") {
      return NextResponse.json(
        { error: "Este lead ya está vendido, no necesita renovación." },
        { status: 400 }
      );
    }

    console.error("Error renovando seguimiento:", err);
    return NextResponse.json({ error: "Error al renovar el seguimiento" }, { status: 500 });
  }
}

function authError(err: unknown) {
  const message = err instanceof Error ? err.message : "Error";
  if (message === "BLOCKED") {
    return NextResponse.json({ error: "Tu cuenta ha sido bloqueada" }, { status: 403 });
  }
  return NextResponse.json({ error: "No autenticado" }, { status: 401 });
}
