import { NextRequest, NextResponse } from "next/server";
import { getProduct } from "@/lib/products";
import { readLeadsForProduct, getAvailableLeadIdsInOrder } from "@/lib/csv";
import { adminDb } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth-server";
import { getPlatformConfig } from "@/lib/config";
import {
  assignmentDocId,
  AssignmentDoc,
  ASSIGNMENT_DURATION_MS,
  COUNTS_TOWARD_LIMIT,
  MAX_ACTIVE_LEADS_PER_USER,
  isAssignmentActive,
} from "@/lib/types";

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

  const product = getProduct(productId);
  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  // Verificar que el lead exista de verdad en los CSV del producto (evita
  // asignar ids inventados desde el frontend).
  const leads = readLeadsForProduct(product.id, product.csvFiles);
  const lead = leads.find((l) => l.leadId === leadId);
  if (!lead) {
    return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  }

  const docId = assignmentDocId(product.id, leadId);
  const docRef = adminDb.collection("assignments").doc(docId);

  try {
    const result = await adminDb.runTransaction(async (tx) => {
      // ---- 1. ¿Este lead concreto ya está ocupado por alguien? ----------
      const snap = await tx.get(docRef);
      if (snap.exists) {
        const existing = snap.data() as AssignmentDoc;
        if (isAssignmentActive(existing)) {
          throw new Error(
            existing.userId === user.uid ? "ALREADY_YOURS" : `TAKEN_BY:${existing.userName}`
          );
        }
      }

      // ---- 2. ¿Este leadId está dentro de la ventana progresiva visible? -
      // Cierra el hueco real de seguridad: sin esto, alguien podría mandar
      // directamente un leadId real que nunca ha aparecido en SU propia
      // respuesta de GET /api/leads (obtenido por otra vía: inspección de
      // tráfico ajeno, fuerza bruta del hash, etc.) y asignárselo aunque
      // esté fuera de su ventana de 20. Se recalcula con el MISMO criterio
      // que el listado (getAvailableLeadIdsInOrder), dentro de esta misma
      // transacción, para que no haya ventana de tiempo entre "comprobar" y
      // "asignar" en la que la cola pueda haber cambiado de forma relevante.
      //
      // Nota: esta lectura de TODAS las asignaciones del producto va DENTRO
      // de la transacción a propósito, igual que el conteo del límite de 10
      // — Firestore reintenta la transacción si los datos leídos cambian
      // entre medias, así que el resultado sigue siendo correcto incluso
      // con alta concurrencia.
      const allAssignmentsSnap = await tx.get(
        adminDb.collection("assignments").where("productId", "==", product.id)
      );
      const assignmentsByLeadId = new Map<string, AssignmentDoc>();
      allAssignmentsSnap.forEach((d) => {
        const data = d.data() as AssignmentDoc;
        assignmentsByLeadId.set(data.leadId, data);
      });

      const { visibleLeadsWindow } = await getPlatformConfig();
      const availableInOrder = getAvailableLeadIdsInOrder(leads, assignmentsByLeadId);
      const visibleWindow = new Set(availableInOrder.slice(0, visibleLeadsWindow));

      if (!visibleWindow.has(leadId)) {
        throw new Error("OUTSIDE_WINDOW");
      }

      // ---- 3. ¿Este usuario ya tiene 10 leads activos? -------------------
      // Nota: esta lectura va DENTRO de la transacción para que sea
      // consistente con la escritura de más abajo — dos peticiones
      // simultáneas del mismo usuario no pueden colarse ambas a 11, porque
      // Firestore reintenta la transacción si detecta que los datos leídos
      // cambiaron entre medias.
      const activeSnap = await tx.get(
        adminDb
          .collection("assignments")
          .where("userId", "==", user.uid)
          .where("status", "in", COUNTS_TOWARD_LIMIT)
      );
      // isAssignmentActive también filtra por expiresAt, porque un doc con
      // status "interesado" pero ya expirado no debe contar contra el
      // límite aunque la query de Firestore (que no puede comparar
      // timestamps arbitrarios junto a un "in") lo haya devuelto.
      const activeCount = activeSnap.docs.filter((d) =>
        isAssignmentActive(d.data() as AssignmentDoc)
      ).length;

      if (activeCount >= MAX_ACTIVE_LEADS_PER_USER) {
        throw new Error("LIMIT_REACHED");
      }

      // ---- 4. Crear la asignación -----------------------------------------
      const now = new Date();
      const expires = new Date(now.getTime() + ASSIGNMENT_DURATION_MS);

      const newDoc: AssignmentDoc = {
        productId: product.id,
        leadId,
        userId: user.uid,
        userEmail: user.email,
        userName: user.name,
        assignedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        status: "asignado",
        renewalCount: 0,
        renewalHistory: [],
        sale: null,
        history: [{ status: "asignado", at: now.toISOString(), by: user.uid, byName: user.name }],
        referralCode: null,
      };

      tx.set(docRef, newDoc);
      return newDoc;
    });

    return NextResponse.json({ assignment: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";

    if (message === "ALREADY_YOURS") {
      return NextResponse.json({ error: "Ya tienes este lead asignado" }, { status: 409 });
    }
    if (message.startsWith("TAKEN_BY:")) {
      const name = message.split(":")[1];
      return NextResponse.json({ error: `Este lead ya está asignado a ${name}` }, { status: 409 });
    }
    if (message === "OUTSIDE_WINDOW") {
      return NextResponse.json(
        { error: "Este lead no está disponible en tu cola actual. Actualiza el listado." },
        { status: 403 }
      );
    }
    if (message === "LIMIT_REACHED") {
      return NextResponse.json(
        {
          error: `Tienes ${MAX_ACTIVE_LEADS_PER_USER} leads activos. Libera uno antes de tomar otro.`,
        },
        { status: 409 }
      );
    }

    console.error("Error asignando lead:", err);
    return NextResponse.json({ error: "Error al asignar el lead" }, { status: 500 });
  }
}

function authError(err: unknown) {
  const message = err instanceof Error ? err.message : "Error";
  if (message === "BLOCKED") {
    return NextResponse.json({ error: "Tu cuenta ha sido bloqueada" }, { status: 403 });
  }
  return NextResponse.json({ error: "No autenticado" }, { status: 401 });
}
