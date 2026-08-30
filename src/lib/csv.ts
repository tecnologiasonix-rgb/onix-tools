import { parse } from "csv-parse/sync";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import { AssignmentDoc, isAssignmentActive, Lead, ProductId } from "@/lib/types";

function makeLeadId(productId: string, nombre: string, direccion: string): string {
  const raw = `${productId}::${nombre.trim().toLowerCase()}::${direccion.trim().toLowerCase()}`;
  return createHash("sha1").update(raw).digest("hex").slice(0, 16);
}

function readOneCsv(productId: ProductId, csvFile: string): Lead[] {
  const filePath = path.join(process.cwd(), "data", csvFile);
  const raw = readFileSync(filePath, "utf-8");

  const records: Record<string, string>[] = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  // Los leads "nunca tocados" del CSV se consideran disponibles desde el
  // origen de los tiempos (epoch) a efectos de orden — así siempre van
  // ANTES que cualquier lead liberado más tarde, cumpliendo la cola FIFO
  // (liberado = va al final) sin necesitar una fecha real de importación.
  const EPOCH = new Date(0).toISOString();

  return records.map((r) => {
    const nombre = r.nombre ?? "";
    const direccion = r.direccion ?? "";
    return {
      leadId: makeLeadId(productId, nombre, direccion),
      productId,
      nombre,
      pais: r.pais ?? "",
      ciudadZona: r.ciudad_zona ?? "",
      direccion,
      telefono: r.telefono ?? "",
      email: r.email ?? "",
      web: r.web ?? "",
      tipoNegocio: r.tipo ?? "",
      cp: r.cp ?? "",
      estadoOrigen: r.estado_origen ?? "",
      notas: r.notas ?? "",
      availableSince: EPOCH,
    };
  });
}

/**
 * Lee y fusiona los leads de TODOS los CSV de un producto (uno o varios).
 * Los leads en sí no se guardan en Firestore — el estado de cada uno
 * (asignación, venta) vive aparte, indexado por leadId.
 *
 * Deduplica por leadId (= mismo nombre+dirección normalizados) quedándose
 * con la primera aparición: los CSV de origen pueden traer la misma fila
 * repetida (scraping duplicado) o solaparse entre sí si un producto usa
 * varios archivos, y sin este paso cada repetición generaba una tarjeta de
 * lead adicional en la plataforma con idéntico leadId.
 */
export function readLeadsForProduct(productId: ProductId, csvFiles: string[]): Lead[] {
  const all = csvFiles.flatMap((file) => readOneCsv(productId, file));
  const seen = new Set<string>();
  const deduped: Lead[] = [];
  for (const lead of all) {
    if (seen.has(lead.leadId)) continue;
    seen.add(lead.leadId);
    deduped.push(lead);
  }
  return deduped;
}

/**
 * Calcula, para un producto dado, qué leadIds están DISPONIBLES (nadie los
 * tiene activos ahora mismo) y ORDENADOS por la cola FIFO — el mismo cálculo
 * que usa el listado (GET /api/leads) para decidir qué se muestra.
 *
 * Se extrae aquí como función compartida para que GET /api/leads (qué se
 * MUESTRA) y POST /api/leads/select (qué se puede TOMAR) usen exactamente
 * el mismo criterio de "disponible y en qué orden" — si mañana cambia cómo
 * se ordena la cola, cambia en un solo sitio y ambos endpoints quedan
 * consistentes automáticamente, sin riesgo de que diverjan.
 */
export function getAvailableLeadIdsInOrder(
  leads: Lead[],
  assignmentsByLeadId: Map<string, AssignmentDoc>
): string[] {
  const available = leads
    .filter((lead) => {
      const assignment = assignmentsByLeadId.get(lead.leadId);
      return !assignment || !isAssignmentActive(assignment);
    })
    .map((lead) => {
      const assignment = assignmentsByLeadId.get(lead.leadId);
      const effectiveAvailableSince = assignment ? assignment.expiresAt : lead.availableSince;
      return { leadId: lead.leadId, availableSince: effectiveAvailableSince };
    });

  available.sort(
    (a, b) => new Date(a.availableSince).getTime() - new Date(b.availableSince).getTime()
  );

  return available.map((l) => l.leadId);
}

export type { Lead };
