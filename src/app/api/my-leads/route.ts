import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth-server";
import { AssignmentDoc, isAssignmentActive } from "@/lib/types";
import { PRODUCTS, getProduct } from "@/lib/products";
import { readLeadsForProduct, Lead } from "@/lib/csv";

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    if (message === "BLOCKED") {
      return NextResponse.json({ error: "Tu cuenta ha sido bloqueada" }, { status: 403 });
    }
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const snapshot = await adminDb
    .collection("assignments")
    .where("userId", "==", user.uid)
    .get();

  // Index de leads por producto para poder mostrar nombre/dirección/teléfono
  const leadsCache = new Map<string, Lead[]>();
  function getLeadsFor(productId: string) {
    if (!leadsCache.has(productId)) {
      const product = PRODUCTS.find((p) => p.id === productId);
      if (!product) return [];
      leadsCache.set(
        productId,
        readLeadsForProduct(product.id, product.csvFiles)
      );
    }
    return leadsCache.get(productId)!;
  }

  const allAssignments = snapshot.docs.map((doc) => doc.data() as AssignmentDoc);

  // Verificación LAZY: una asignación que ya expiró (72h sin renovar ni
  // vender) no se muestra en "mis leads" activos, aunque el doc de
  // Firestore todavía diga "asignado" hasta que el cron diario lo corrija.
  // "vendido" siempre se muestra (nunca expira, es historial permanente).
  const items = allAssignments
    .filter((a) => a.status === "vendido" || isAssignmentActive(a))
    .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())
    .map((assignment) => {
      const leads = getLeadsFor(assignment.productId);
      const lead = leads.find((l) => l.leadId === assignment.leadId);
      const product = getProduct(assignment.productId);
      return {
        assignment,
        lead: lead ?? null,
        productName: product?.name ?? assignment.productId,
      };
    });

  return NextResponse.json({ items });
}
