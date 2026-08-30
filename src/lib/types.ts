// =============================================================================
// OnixWork — Sistema de tipos central
// =============================================================================
// Este archivo es la fuente de verdad de todas las entidades de negocio.
// Las colecciones de Firestore reales son:
//
//   users/{uid}                          → perfil, rol, código de referido
//   assignments/{productId_leadId}       → 1 doc por lead activo/histórico
//   referrals/{code}                     → atribución de venta vía referido,
//                                           SEPARADA de la asignación temporal
//
// Los LEADS EN SÍ no se guardan en Firestore (igual que en la herramienta
// privada de origen): se leen de los CSV en /data. Solo su ESTADO de venta
// (assignment) vive en base de datos, indexado por un leadId estable
// (hash de nombre+dirección, ver src/lib/csv.ts).
// =============================================================================

// -----------------------------------------------------------------------------
// Usuarios y roles
// -----------------------------------------------------------------------------

export type UserRole = "vendedor" | "admin";
export type UserStatus = "activo" | "bloqueado";

export type UserDoc = {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  /**
   * Código de referido único y estable. Se genera una sola vez al crear el
   * perfil (ver src/lib/referral.ts) y nunca cambia — es la clave con la que
   * se atribuyen ventas incluso después de que el lead haya sido liberado y
   * reasignado a otro vendedor (ver ReferralDoc más abajo).
   */
  referralCode: string;
  createdAt: string; // ISO string, timestamp de servidor
};

// -----------------------------------------------------------------------------
// Productos — catálogo FIJO, sin concepto de "sector"
// -----------------------------------------------------------------------------
// Solo existen dos productos. El campo "tipo" que traen los CSV (Bar
// Restaurante, Gimnasio Boutique, Peluquería...) es informativo dentro de la
// ficha del lead — ayuda al vendedor a adaptar el discurso — pero NUNCA
// determina la navegación ni el nombre mostrado del producto.

export type ProductId = "camarero-digital" | "citamanager";

export type Product = {
  id: ProductId;
  name: string; // nombre mostrado al vendedor — NUNCA el sector del CSV
  description: string;
  precio: string; // texto libre (ej. "49€/mes"), no se usa para cálculos
  caracteristicas: string[];
  enlaceInfo: string | null; // demo / info externa
  duracionPruebaDias: number | null; // 14 para ambos, pero configurable
  condicionesVenta: string;
  /**
   * % de comisión que genera este producto SOLO sobre pago_unico.
   * Configurable por producto (hoy 40 para ambos), NUNCA sobre suscripción.
   * Cambiar este valor solo afecta a ventas NUEVAS — las ventas ya
   * registradas guardan su propio comisionPorcentaje congelado (ver SaleInfo).
   */
  comisionPorcentaje: number;
  activo: boolean;
  /** Uno o varios CSV en /data que alimentan los leads de este producto. */
  csvFiles: string[];
};

// -----------------------------------------------------------------------------
// Leads (leídos de CSV, no de Firestore) — ver src/lib/csv.ts
// -----------------------------------------------------------------------------

export type Lead = {
  leadId: string; // hash estable, independiente del orden del CSV
  productId: ProductId;
  nombre: string;
  pais: string;
  ciudadZona: string;
  direccion: string;
  telefono: string;
  email: string;
  web: string;
  tipoNegocio: string; // informativo (ex "tipo" del CSV) — nunca es "el producto"
  cp: string;
  estadoOrigen: string; // metadata de cómo se generó el lead (new/contacted/investigated)
  notas: string;
  /**
   * Timestamp desde el que este lead está "disponible para tomar" a efectos
   * de orden de cola. Los leads nunca tocados del CSV lo tienen desde la
   * importación; un lead liberado (expirado o manual) lo actualiza al
   * momento de la liberación, mandándolo al FINAL de la fila (FIFO).
   */
  availableSince: string;
};

// -----------------------------------------------------------------------------
// Asignaciones — la pieza central del sistema de leads
// -----------------------------------------------------------------------------

export type LeadStatus =
  | "asignado"
  | "contactado"
  | "interesado"
  | "vendido"
  | "liberado";

/** Estados que cuentan contra el límite de 10 leads simultáneos por vendedor. */
export const COUNTS_TOWARD_LIMIT: LeadStatus[] = ["asignado", "contactado", "interesado"];

export const MAX_ACTIVE_LEADS_PER_USER = 10;
export const ASSIGNMENT_DURATION_MS = 72 * 60 * 60 * 1000; // 72 horas

/**
 * Nº máximo de leads DISPONIBLES (nadie los tiene) que un vendedor puede
 * VER a la vez en su listado, aunque la base tenga miles. Es un control
 * distinto y adicional al de MAX_ACTIVE_LEADS_PER_USER:
 *
 *   - MAX_ACTIVE_LEADS_PER_USER  → cuántos puede TENER EN MANO a la vez.
 *   - DEFAULT_VISIBLE_LEADS_WINDOW → de los que nadie tiene, cuántos puede
 *                                     VER en su cola, de forma progresiva.
 *
 * Este valor es el default de fábrica. El valor real y ajustable en
 * caliente vive en Firestore (config/platform), ver src/lib/config.ts —
 * así el admin puede cambiarlo sin desplegar código nuevo.
 */
export const DEFAULT_VISIBLE_LEADS_WINDOW = 20;

export type PlatformConfig = {
  visibleLeadsWindow: number;
};

export type RenewalLogEntry = {
  at: string; // ISO, timestamp de servidor
  by: string; // uid del vendedor que renovó
  previousExpiresAt: string;
  newExpiresAt: string;
};

export type SaleInfo = {
  /**
   * DECISIÓN DE NEGOCIO (confirmada explícitamente): esta plataforma solo
   * trabaja con pago único. La suscripción mensual con comisión recurrente
   * se planteó y se descartó — habría requerido una integración con el
   * sistema de pagos externo (para confirmar mes a mes si el cliente sigue
   * activo) que hoy no existe. Se retira el campo "tipoPago" en vez de
   * dejarlo con un solo valor posible, para no dejar una señal confusa de
   * opcionalidad donde ya no la hay.
   *
   * Si en el futuro se retoma la venta por suscripción, este es el punto
   * exacto donde reintroducir la distinción — con su propio modelo de
   * periodos mensuales, no reutilizando este campo.
   */
  importe: number; // bruto, lo que pagó el cliente
  moneda: string;
  referenciaPago: string;
  fechaHoraPago: string; // ISO string
  /**
   * Comisión CONGELADA en el momento de la venta. Nunca se recalcula
   * retroactivamente si el % del producto cambia después — una venta de
   * ayer no cambia de valor porque hoy se ajuste la tarifa.
   */
  comisionPorcentaje: number;
  comisionImporte: number;
};

export type ActivityLogEntry = {
  status: string;
  at: string;
  by: string; // uid
  byName: string;
};

export type AssignmentDoc = {
  productId: ProductId;
  leadId: string;
  userId: string;
  userEmail: string;
  userName: string;
  assignedAt: string;
  expiresAt: string;
  status: LeadStatus;
  /**
   * Nº de veces que este vendedor ha pulsado "Renovar seguimiento" sobre
   * esta asignación. Expuesto ahora solo como dato auditable; los límites
   * antifraude (máx. renovaciones, revisión admin) se añaden después sin
   * cambiar esta forma de datos.
   */
  renewalCount: number;
  renewalHistory: RenewalLogEntry[];
  sale: SaleInfo | null;
  history: ActivityLogEntry[];
  /**
   * Código de referido que originó el contacto con este lead, si el
   * vendedor generó/usó un enlace de referido para él. Independiente del
   * ciclo de vida de la asignación — ver ReferralDoc.
   */
  referralCode: string | null;
};

export function assignmentDocId(productId: ProductId, leadId: string): string {
  return `${productId}_${leadId}`;
}

/**
 * Un lead vendido nunca expira ni se libera — queda fijado para siempre a
 * esa venta. El resto de estados expiran a las 72h desde assignedAt/última
 * renovación, salvo que se renueve antes.
 */
export function isAssignmentActive(a: Pick<AssignmentDoc, "status" | "expiresAt">): boolean {
  if (a.status === "vendido") return true;
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

// -----------------------------------------------------------------------------
// Referidos — atribución de venta, separada de la asignación temporal
// -----------------------------------------------------------------------------
// CLAVE DE DISEÑO: "assignments" (quién tiene el lead AHORA, temporal, 72h) y
// "referrals" (quién se lo ganó, permanente) son colecciones separadas a
// propósito. Liberar un lead a las 72h nunca debe borrar el derecho a
// comisión de quien lo trabajó primero y generó el enlace de referido.
//
// La clave del documento es `${code}_${leadId}`, NO solo `code`: un mismo
// vendedor genera enlaces de referido para MUCHOS leads distintos a lo
// largo del tiempo (cada cliente al que contacta), así que el código por sí
// solo no identifica un evento de referido concreto — la combinación de
// quién lo generó y para qué lead sí.

export type ReferralStatus = "activo" | "convertido" | "expirado";

export type ReferralDoc = {
  code: string; // = referralCode del vendedor que generó el enlace
  userId: string;
  productId: ProductId;
  leadId: string;
  createdAt: string;
  firstContactAt: string | null;
  convertedAt: string | null;
  status: ReferralStatus;
};

export function referralDocId(code: string, leadId: string): string {
  return `${code}_${leadId}`;
}

// -----------------------------------------------------------------------------
// Vista derivada — leads enriquecidos para el frontend
// -----------------------------------------------------------------------------

export type EnrichedLead = Lead & {
  assignment: {
    status: LeadStatus;
    assignedToMe: boolean;
    assignedToName: string;
    expiresAt: string;
    renewalCount: number;
    sale: SaleInfo | null;
  } | null;
};
