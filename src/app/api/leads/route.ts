import { NextRequest, NextResponse } from "next/server";
import { getProduct } from "@/lib/products";
import { readLeadsCsv } from "@/lib/csv";
import { adminDb } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth-server";
import { AssignmentDoc, isAssignmentActive } from "@/lib/assignments";

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "Falta productId" }, { status: 400 });
  }

  const product = getProduct(productId);
  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  const leads = readLeadsCsv(product.id, product.csvFile);

  // Traer todas las asignaciones de este producto de una vez (más eficiente
  // que una consulta por lead). El free tier de Firestore da 50k lecturas/día,
  // y esto cuenta como N lecturas donde N = nº de asignaciones existentes,
  // no nº de leads del CSV.
  const snapshot = await adminDb
    .collection("assignments")
    .where("productId", "==", product.id)
    .get();

  const assignmentsByLeadId = new Map<string, AssignmentDoc>();
  snapshot.forEach((doc) => {
    const data = doc.data() as AssignmentDoc;
    assignmentsByLeadId.set(data.leadId, data);
  });

  const enriched = leads.map((lead) => {
    const assignment = assignmentsByLeadId.get(lead.leadId);
    const active = assignment ? isAssignmentActive(assignment) : false;

    return {
      ...lead,
      assignment: active
        ? {
            status: assignment!.status,
            assignedToMe: assignment!.userId === user.uid,
            assignedToName: assignment!.userName,
            expiresAt: assignment!.expiresAt,
            sale: assignment!.sale,
          }
        : null,
    };
  });

  return NextResponse.json({ product: { id: product.id, name: product.name }, leads: enriched });
}
