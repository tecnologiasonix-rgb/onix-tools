// Modelo de datos en Firestore
//
// Colección "assignments", un documento por lead activo/histórico:
//   docId = `${productId}_${leadId}`
//
// Campos:
//   productId: string
//   leadId: string
//   userId: string            (uid de Firebase Auth del vendedor)
//   userEmail: string
//   userName: string
//   assignedAt: Timestamp
//   expiresAt: Timestamp      (assignedAt + 72h)
//   status: "asignado" | "contactado" | "interesado" | "vendido" | "liberado"
//   sale: {                   (solo si status === "vendido")
//     tipoPago: "suscripcion_mensual" | "pago_unico"
//     importe: number
//     moneda: string
//     referenciaPago: string  (nº de operación / factura / referencia verificable)
//     fechaHoraPago: Timestamp
//   } | null
//   history: Array<{ status: string; at: Timestamp; by: string }>
//
// Regla de negocio clave:
//   - Un lead con asignación activa (status en "asignado"|"contactado"|"interesado"
//     y expiresAt > ahora) NO puede ser tomado por otro usuario.
//   - Si pasan 72h sin que se marque "vendido", el lead vuelve a estar libre
//     para cualquiera (se calcula en el momento de leer, no hace falta cron).
//   - "vendido" congela el lead: queda para siempre asociado a ese user/venta,
//     ya no vuelve a la piscina de disponibles.

export const ASSIGNMENT_DURATION_MS = 72 * 60 * 60 * 1000; // 72 horas

export type LeadStatus =
  | "asignado"
  | "contactado"
  | "interesado"
  | "vendido"
  | "liberado";

export type SaleInfo = {
  tipoPago: "suscripcion_mensual" | "pago_unico";
  importe: number;
  moneda: string;
  referenciaPago: string;
  fechaHoraPago: string; // ISO string
};

export type AssignmentDoc = {
  productId: string;
  leadId: string;
  userId: string;
  userEmail: string;
  userName: string;
  assignedAt: string; // ISO string
  expiresAt: string; // ISO string
  status: LeadStatus;
  sale: SaleInfo | null;
  history: Array<{ status: string; at: string; by: string }>;
};

export function assignmentDocId(productId: string, leadId: string): string {
  return `${productId}_${leadId}`;
}

export function isAssignmentActive(a: Pick<AssignmentDoc, "status" | "expiresAt">): boolean {
  if (a.status === "vendido") return true; // vendido nunca expira / se libera
  if (a.status === "liberado") return false;
  const expired = new Date(a.expiresAt).getTime() <= Date.now();
  return !expired;
}

const VALID_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  asignado: ["contactado", "interesado", "vendido", "liberado"],
  contactado: ["interesado", "vendido", "liberado"],
  interesado: ["vendido", "liberado"],
  vendido: [],
  liberado: [],
};

export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
