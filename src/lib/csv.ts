import { parse } from "csv-parse/sync";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import path from "path";

export type Lead = {
  leadId: string; // hash estable derivado de nombre+dirección (no cambia entre lecturas)
  nombre: string;
  pais: string;
  ciudad_zona: string;
  direccion: string;
  telefono: string;
  email: string;
  web: string;
  tipo: string;
  cp: string;
  estado_origen: string;
  notas: string;
};

function makeLeadId(productId: string, nombre: string, direccion: string): string {
  const raw = `${productId}::${nombre.trim().toLowerCase()}::${direccion.trim().toLowerCase()}`;
  return createHash("sha1").update(raw).digest("hex").slice(0, 16);
}

/**
 * Lee y parsea el CSV de un producto desde /data.
 * Los CSV viven en el repo (solo lectura en runtime) — el estado (asignación,
 * estado de venta, etc.) vive aparte, en Firestore, indexado por leadId.
 */
export function readLeadsCsv(productId: string, csvFile: string): Lead[] {
  const filePath = path.join(process.cwd(), "data", csvFile);
  const raw = readFileSync(filePath, "utf-8");

  const records: Record<string, string>[] = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records.map((r) => {
    const nombre = r.nombre ?? "";
    const direccion = r.direccion ?? "";
    return {
      leadId: makeLeadId(productId, nombre, direccion),
      nombre,
      pais: r.pais ?? "",
      ciudad_zona: r.ciudad_zona ?? "",
      direccion,
      telefono: r.telefono ?? "",
      email: r.email ?? "",
      web: r.web ?? "",
      tipo: r.tipo ?? "",
      cp: r.cp ?? "",
      estado_origen: r.estado_origen ?? "",
      notas: r.notas ?? "",
    };
  });
}
