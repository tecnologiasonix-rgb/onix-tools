import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth-server";
import { AssignmentDoc } from "@/lib/types";
import { getProduct } from "@/lib/products";

const MAX_RANKING_SIZE = 50;

/**
 * Ranking (top 50 por comisión acumulada) y muro de ventas individuales.
 * Público para cualquier vendedor logueado (decisión de negocio confirmada
 * explícitamente) — no requiere rol admin, a diferencia de /api/admin/*.
 *
 * Solo se calcula sobre comisión de vendedor (no importe bruto de la
 * venta) — también confirmado explícitamente. El muro de ventas NO expone
 * ningún dato del cliente comprador (nombre de negocio, teléfono, email):
 * solo producto, vendedor y fecha, precisamente porque es visible entre
 * vendedores que compiten por los mismos leads.
 */
export async function GET(req: NextRequest) {
  try {
    await requireUser(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    if (message === "BLOCKED") {
      return NextResponse.json({ error: "Tu cuenta ha sido bloqueada" }, { status: 403 });
    }
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const snapshot = await adminDb.collection("assignments").where("status", "==", "vendido").get();
  const ventas = snapshot.docs.map((doc) => doc.data() as AssignmentDoc).filter((a) => a.sale);

  // ---- Ranking: agregado por vendedor, top 50 estricto ----
  const byUser = new Map<string, { userId: string; userName: string; comision: number; ventas: number }>();
  for (const v of ventas) {
    const entry = byUser.get(v.userId) ?? {
      userId: v.userId,
      userName: v.userName,
      comision: 0,
      ventas: 0,
    };
    entry.comision += v.sale!.comisionImporte;
    entry.ventas += 1;
    byUser.set(v.userId, entry);
  }

  const ranking = Array.from(byUser.values())
    .sort((a, b) => b.comision - a.comision)
    .slice(0, MAX_RANKING_SIZE)
    .map((entry, index) => ({ ...entry, position: index + 1 }));

  // ---- Muro: ventas individuales, sin datos del cliente comprador ----
  const muro = ventas
    .sort((a, b) => new Date(b.sale!.fechaHoraPago).getTime() - new Date(a.sale!.fechaHoraPago).getTime())
    .slice(0, 100) // el muro también se acota, no tiene sentido cargar miles de filas
    .map((v) => ({
      userName: v.userName,
      productName: getProduct(v.productId)?.name ?? v.productId,
      comisionImporte: v.sale!.comisionImporte,
      fechaHoraPago: v.sale!.fechaHoraPago,
      // Deliberadamente NO se incluye: nombre del lead/negocio, teléfono,
      // email, dirección, ni referenciaPago — es información del cliente
      // comprador o del pago en sí, y este muro es visible entre
      // vendedores, no solo para quien hizo la venta.
    }));

  return NextResponse.json({ ranking, muro });
}
