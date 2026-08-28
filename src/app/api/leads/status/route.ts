import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth-server";
import {
  assignmentDocId,
  AssignmentDoc,
  LeadStatus,
  SaleInfo,
  canTransition,
  isAssignmentActive,
} from "@/lib/assignments";

const VALID_STATUSES: LeadStatus[] = ["contactado", "interesado", "vendido", "liberado"];

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const productId = body?.productId as string | undefined;
  const leadId = body?.leadId as string | undefined;
  const newStatus = body?.status as LeadStatus | undefined;
  const sale = body?.sale as SaleInfo | undefined;

  if (!productId || !leadId || !newStatus) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  if (!VALID_STATUSES.includes(newStatus)) {
    return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
  }

  // Validación de los datos de venta, obligatorios y verificables
  if (newStatus === "vendido") {
    if (!sale) {
      return NextResponse.json(
        { error: "Debes indicar los datos de la venta" },
        { status: 400 }
      );
    }
    if (!["suscripcion_mensual", "pago_unico"].includes(sale.tipoPago)) {
      return NextResponse.json(
        { error: "tipoPago debe ser 'suscripcion_mensual' o 'pago_unico'" },
        { status: 400 }
      );
    }
    if (typeof sale.importe !== "number" || sale.importe <= 0) {
      return NextResponse.json(
        { error: "El importe debe ser un número mayor que 0" },
        { status: 400 }
      );
    }
    if (!sale.referenciaPago || sale.referenciaPago.trim().length < 3) {
      return NextResponse.json(
        { error: "La referencia de pago es obligatoria (nº de operación, factura, etc.)" },
        { status: 400 }
      );
    }
    if (!sale.fechaHoraPago || isNaN(new Date(sale.fechaHoraPago).getTime())) {
      return NextResponse.json(
        { error: "Fecha/hora de pago no válida" },
        { status: 400 }
      );
    }
  }

  const docId = assignmentDocId(productId, leadId);
  const docRef = adminDb.collection("assignments").doc(docId);

  try {
    const result = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      if (!snap.exists) {
        throw new Error("NOT_FOUND");
      }
      const existing = snap.data() as AssignmentDoc;

      if (existing.userId !== user.uid) {
        throw new Error("NOT_OWNER");
      }
      if (!isAssignmentActive(existing)) {
        throw new Error("EXPIRED");
      }
      if (!canTransition(existing.status, newStatus)) {
        throw new Error(`INVALID_TRANSITION:${existing.status}->${newStatus}`);
      }

      const now = new Date().toISOString();
      const updated: AssignmentDoc = {
        ...existing,
        status: newStatus,
        sale: newStatus === "vendido" ? (sale as SaleInfo) : existing.sale,
        history: [
          ...existing.history,
          { status: newStatus, at: now, by: user.name },
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
        { error: "La asignación de 72h ha expirado. El lead ya no es tuyo." },
        { status: 410 }
      );
    }
    if (message.startsWith("INVALID_TRANSITION")) {
      return NextResponse.json(
        { error: "No se puede pasar a ese estado desde el estado actual" },
        { status: 400 }
      );
    }

    console.error("Error cambiando estado:", err);
    return NextResponse.json({ error: "Error al actualizar el estado" }, { status: 500 });
  }
}
