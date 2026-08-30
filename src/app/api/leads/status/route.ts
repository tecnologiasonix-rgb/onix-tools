import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth-server";
import { getProduct } from "@/lib/products";
import { calculateCommission } from "@/lib/commission";
import {
  assignmentDocId,
  referralDocId,
  AssignmentDoc,
  ReferralDoc,
  LeadStatus,
  canTransition,
  isAssignmentActive,
} from "@/lib/types";

const VALID_STATUSES: LeadStatus[] = ["contactado", "interesado", "vendido", "liberado"];

// Lo único que el cliente puede mandar para una venta es DATO DE HECHO
// (qué pagó el cliente, cuándo, con qué referencia) — nunca la comisión.
// La comisión SIEMPRE se calcula en servidor a partir del % del producto
// en este instante (ver calculateCommission), ignorando cualquier campo
// "comision" que pudiera venir en el body. Esto es deliberado: si
// aceptáramos un importe de comisión desde el frontend, cualquiera con las
// herramientas de desarrollador podría intentar declararse una comisión
// arbitraria.
//
// No hay campo tipoPago: esta plataforma solo trabaja con pago único
// (decisión de negocio confirmada explícitamente — ver el comentario en
// SaleInfo, en src/lib/types.ts, sobre por qué se descartó la suscripción
// mensual con comisión recurrente).
type IncomingSale = {
  importe: number;
  moneda: string;
  referenciaPago: string;
  fechaHoraPago: string;
};

// Únicas monedas que ofrece el desplegable de SaleForm.tsx — se valida aquí
// también porque el body de la petición no es de fiar solo por venir del
// propio frontend.
const VALID_CURRENCIES = ["EUR", "USD"];

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
  const newStatus = body?.status as LeadStatus | undefined;
  const incomingSale = body?.sale as IncomingSale | undefined;

  if (!productId || !leadId || !newStatus) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }
  if (!VALID_STATUSES.includes(newStatus)) {
    return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
  }

  const product = getProduct(productId);
  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  // Validación de los datos de venta, obligatorios y verificables
  let commission: { comisionPorcentaje: number; comisionImporte: number } | null = null;
  if (newStatus === "vendido") {
    if (!incomingSale) {
      return NextResponse.json({ error: "Debes indicar los datos de la venta" }, { status: 400 });
    }
    if (typeof incomingSale.importe !== "number" || incomingSale.importe <= 0) {
      return NextResponse.json({ error: "El importe debe ser un número mayor que 0" }, { status: 400 });
    }
    if (!incomingSale.moneda || !VALID_CURRENCIES.includes(incomingSale.moneda)) {
      return NextResponse.json({ error: "Moneda no válida" }, { status: 400 });
    }
    if (!incomingSale.referenciaPago || incomingSale.referenciaPago.trim().length < 3) {
      return NextResponse.json(
        { error: "La referencia de pago es obligatoria (nº de operación, factura, etc.)" },
        { status: 400 }
      );
    }
    if (!incomingSale.fechaHoraPago || isNaN(new Date(incomingSale.fechaHoraPago).getTime())) {
      return NextResponse.json({ error: "Fecha/hora de pago no válida" }, { status: 400 });
    }

    // La comisión se calcula AQUÍ, en servidor, a partir del % del
    // producto ahora mismo. El resultado se congela en el documento de
    // venta y no se recalcula si el % del producto cambia después.
    commission = calculateCommission(product, incomingSale.importe);
  }

  const docId = assignmentDocId(product.id, leadId);
  const docRef = adminDb.collection("assignments").doc(docId);

  try {
    const result = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      if (!snap.exists) throw new Error("NOT_FOUND");
      const existing = snap.data() as AssignmentDoc;

      if (existing.userId !== user.uid) throw new Error("NOT_OWNER");
      if (!isAssignmentActive(existing)) throw new Error("EXPIRED");
      if (!canTransition(existing.status, newStatus)) {
        throw new Error(`INVALID_TRANSITION:${existing.status}->${newStatus}`);
      }

      // Si esta asignación tiene un referido asociado y se está marcando
      // como vendida, hay que leer el ReferralDoc AHORA (todas las lecturas
      // de una transacción de Firestore deben ir antes de cualquier
      // escritura) para poder marcarlo "convertido" en el mismo commit
      // atómico que la venta — así nunca puede quedar un lead vendido con
      // su referido sin actualizar por un fallo a mitad de camino.
      let referralRef: FirebaseFirestore.DocumentReference | null = null;
      if (newStatus === "vendido" && existing.referralCode) {
        referralRef = adminDb
          .collection("referrals")
          .doc(referralDocId(existing.referralCode, leadId));
        // Se comprueba que exista antes de escribir sobre él con tx.get,
        // aunque no se usa el contenido — solo para no fallar si por algún
        // motivo el doc no llegó a crearse.
        await tx.get(referralRef);
      }

      const now = new Date().toISOString();
      const updated: AssignmentDoc = {
        ...existing,
        status: newStatus,
        sale:
          newStatus === "vendido" && incomingSale && commission
            ? {
                importe: incomingSale.importe,
                moneda: incomingSale.moneda,
                referenciaPago: incomingSale.referenciaPago.trim(),
                fechaHoraPago: incomingSale.fechaHoraPago,
                comisionPorcentaje: commission.comisionPorcentaje,
                comisionImporte: commission.comisionImporte,
              }
            : existing.sale,
        history: [
          ...existing.history,
          { status: newStatus, at: now, by: user.uid, byName: user.name },
        ],
      };

      tx.set(docRef, updated);

      if (referralRef) {
        tx.update(referralRef, {
          status: "convertido" as ReferralDoc["status"],
          convertedAt: now,
        });
      }

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

function authError(err: unknown) {
  const message = err instanceof Error ? err.message : "Error";
  if (message === "BLOCKED") {
    return NextResponse.json({ error: "Tu cuenta ha sido bloqueada" }, { status: 403 });
  }
  return NextResponse.json({ error: "No autenticado" }, { status: 401 });
}
