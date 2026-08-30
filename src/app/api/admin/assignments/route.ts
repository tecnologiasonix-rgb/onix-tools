import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/auth-server";
import { getProduct } from "@/lib/products";
import { AssignmentDoc, assignmentDocId, isAssignmentActive } from "@/lib/types";

/**
 * A diferencia de GET /api/leads (que aplica la ventana progresiva de 20
 * y solo devuelve lo relevante para UN vendedor), este endpoint es
 * exclusivo de admin y devuelve TODAS las asignaciones activas de TODOS
 * los vendedores — es precisamente la vista que el punto 15 del documento
 * de negocio pide ("ver todos los leads... ver quién tiene cada lead
 * asignado... ver tiempo restante").
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (err) {
    return adminAuthError(err);
  }

  const snapshot = await adminDb.collection("assignments").get();
  const all = snapshot.docs.map((doc) => doc.data() as AssignmentDoc);

  // Se muestran las activas (trabajo en curso) y las vendidas (historial
  // relevante), pero no las ya liberadas — esas vuelven a la cola normal y
  // no aportan nada útil en esta vista de "quién tiene qué ahora mismo".
  const relevant = all.filter((a) => a.status === "vendido" || isAssignmentActive(a));

  return NextResponse.json({ assignments: relevant });
}

/** Libera manualmente cualquier asignación, sin importar quién sea el dueño. */
export async function POST(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    return adminAuthError(err);
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

  const docId = assignmentDocId(product.id, leadId);
  const docRef = adminDb.collection("assignments").doc(docId);
  const snap = await docRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });
  }

  const existing = snap.data() as AssignmentDoc;
  if (existing.status === "vendido") {
    return NextResponse.json(
      { error: "No se puede liberar un lead ya vendido" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  await docRef.update({
    status: "liberado",
    history: [
      ...existing.history,
      {
        status: "liberado",
        at: now,
        by: admin.uid,
        byName: `${admin.name} (admin)`,
      },
    ],
  });

  return NextResponse.json({ ok: true });
}

function adminAuthError(err: unknown) {
  const message = err instanceof Error ? err.message : "Error";
  if (message === "FORBIDDEN") {
    return NextResponse.json({ error: "Requiere permisos de administrador" }, { status: 403 });
  }
  if (message === "BLOCKED") {
    return NextResponse.json({ error: "Tu cuenta ha sido bloqueada" }, { status: 403 });
  }
  return NextResponse.json({ error: "No autenticado" }, { status: 401 });
}
