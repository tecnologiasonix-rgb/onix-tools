import { NextRequest, NextResponse } from "next/server";
import { getProduct } from "@/lib/products";
import { readLeadsCsv } from "@/lib/csv";
import { adminDb } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth-server";
import {
  assignmentDocId,
  AssignmentDoc,
  ASSIGNMENT_DURATION_MS,
  isAssignmentActive,
} from "@/lib/assignments";

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

  if (!productId || !leadId) {
    return NextResponse.json({ error: "Falta productId o leadId" }, { status: 400 });
  }

  const product = getProduct(productId);
  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  // Verificar que el lead exista de verdad en el CSV (evita asignar ids inventados)
  const leads = readLeadsCsv(product.id, product.csvFile);
  const lead = leads.find((l) => l.leadId === leadId);
  if (!lead) {
    return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  }

  const docId = assignmentDocId(product.id, leadId);
  const docRef = adminDb.collection("assignments").doc(docId);

  try {
    const result = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);

      if (snap.exists) {
        const existing = snap.data() as AssignmentDoc;
        if (isAssignmentActive(existing)) {
          // Ya está ocupado (por mí o por otro) — no se puede reasignar
          throw new Error(
            existing.userId === user.uid
              ? "ALREADY_YOURS"
              : `TAKEN_BY:${existing.userName}`
          );
        }
      }

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
        sale: null,
        history: [{ status: "asignado", at: now.toISOString(), by: user.name }],
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
      return NextResponse.json(
        { error: `Este lead ya está asignado a ${name}` },
        { status: 409 }
      );
    }

    console.error("Error asignando lead:", err);
    return NextResponse.json({ error: "Error al asignar el lead" }, { status: 500 });
  }
}
