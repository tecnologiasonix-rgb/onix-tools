import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth-server";
import { AssignmentDoc } from "@/lib/assignments";
import { PRODUCTS } from "@/lib/products";
import { readLeadsCsv } from "@/lib/csv";

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireUser(req);
  } catch {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const snapshot = await adminDb
    .collection("assignments")
    .where("userId", "==", user.uid)
    .get();

  // Index de leads por producto para poder mostrar nombre/dirección/teléfono
  const leadsCache = new Map<string, ReturnType<typeof readLeadsCsv>>();
  function getLeadsFor(productId: string) {
    if (!leadsCache.has(productId)) {
      const product = PRODUCTS.find((p) => p.id === productId);
      if (!product) return [];
      leadsCache.set(productId, readLeadsCsv(product.id, product.csvFile));
    }
    return leadsCache.get(productId)!;
  }

  const items = snapshot.docs
    .map((doc) => doc.data() as AssignmentDoc)
    .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())
    .map((assignment) => {
      const leads = getLeadsFor(assignment.productId);
      const lead = leads.find((l) => l.leadId === assignment.leadId);
      const product = PRODUCTS.find((p) => p.id === assignment.productId);
      return {
        assignment,
        lead: lead ?? null,
        productName: product?.name ?? assignment.productId,
      };
    });

  return NextResponse.json({ items });
}
