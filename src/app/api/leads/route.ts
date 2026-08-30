import { NextRequest, NextResponse } from "next/server";
import { getProduct } from "@/lib/products";
import { readLeadsForProduct, getAvailableLeadIdsInOrder } from "@/lib/csv";
import { adminDb } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth-server";
import { getPlatformConfig } from "@/lib/config";
import { AssignmentDoc, isAssignmentActive } from "@/lib/types";

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return authError(err);
  }

  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "Falta productId" }, { status: 400 });
  }

  const product = getProduct(productId);
  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  const leads = readLeadsForProduct(product.id, product.csvFiles);

  // Traer todas las asignaciones de este producto de una vez (más eficiente
  // que una consulta por lead). Cuenta como N lecturas donde N = nº de
  // asignaciones EXISTENTES, no nº de leads del CSV.
  const snapshot = await adminDb
    .collection("assignments")
    .where("productId", "==", product.id)
    .get();

  const assignmentsByLeadId = new Map<string, AssignmentDoc>();
  snapshot.forEach((doc) => {
    const data = doc.data() as AssignmentDoc;
    assignmentsByLeadId.set(data.leadId, data);
  });

  // ---- Ventana progresiva de visibilidad (independiente del límite de 10) ----
  // No es "ocultar en el frontend": el recorte pasa AQUÍ, en servidor, ANTES
  // de construir el objeto que se envía. El cliente nunca recibe ni ve en
  // la red los leads disponibles fuera de su ventana — no existen para él
  // en esta respuesta, punto. Con 10.000 leads en el CSV, el vendedor solo
  // puede ver, como mucho, los primeros `visibleLeadsWindow` de la cola.
  //
  // Se usa la MISMA función (getAvailableLeadIdsInOrder) que usará
  // POST /api/leads/select para decidir qué se puede TOMAR — así "lo que se
  // ve" y "lo que se puede tomar" nunca pueden divergir por un cambio futuro
  // en el criterio de orden.
  const { visibleLeadsWindow } = await getPlatformConfig();
  const availableInOrder = getAvailableLeadIdsInOrder(leads, assignmentsByLeadId);
  const visibleAvailableIds = new Set(availableInOrder.slice(0, visibleLeadsWindow));

  const visible = leads
    .filter((lead) => {
      const assignment = assignmentsByLeadId.get(lead.leadId);
      const isOccupied = assignment && isAssignmentActive(assignment);
      // Ocupado (por mí o por otro): siempre visible, es trabajo en curso.
      // Disponible: solo visible si cae dentro de la ventana calculada arriba.
      return isOccupied || visibleAvailableIds.has(lead.leadId);
    })
    .map((lead) => {
      const assignment = assignmentsByLeadId.get(lead.leadId);
      const active = assignment ? isAssignmentActive(assignment) : false;
      const effectiveAvailableSince =
        assignment && !active ? assignment.expiresAt : lead.availableSince;

      return {
        ...lead,
        availableSince: effectiveAvailableSince,
        assignment: active
          ? {
              status: assignment!.status,
              assignedToMe: assignment!.userId === user.uid,
              assignedToName: assignment!.userName,
              expiresAt: assignment!.expiresAt,
              renewalCount: assignment!.renewalCount,
              sale: assignment!.sale,
            }
          : null,
      };
    })
    .sort((a, b) => {
      const aAvailable = !a.assignment;
      const bAvailable = !b.assignment;
      if (aAvailable && bAvailable) {
        return new Date(a.availableSince).getTime() - new Date(b.availableSince).getTime();
      }
      if (aAvailable !== bAvailable) return aAvailable ? -1 : 1;
      return 0;
    });

  return NextResponse.json({
    product: { id: product.id, name: product.name },
    leads: visible,
    // Metadata útil para la UI: cuántos disponibles hay en total en el
    // sistema (para mensajes tipo "20 de 4.850 disponibles"), SIN exponer
    // cuáles son los que quedan fuera de la ventana.
    totalAvailableInSystem: availableInOrder.length,
    visibleLeadsWindow,
  });
}

function authError(err: unknown) {
  const message = err instanceof Error ? err.message : "Error";
  if (message === "BLOCKED") {
    return NextResponse.json({ error: "Tu cuenta ha sido bloqueada" }, { status: 403 });
  }
  if (message === "NO_PROFILE") {
    return NextResponse.json({ error: "Perfil no encontrado, vuelve a iniciar sesión" }, { status: 401 });
  }
  return NextResponse.json({ error: "No autenticado" }, { status: 401 });
}
