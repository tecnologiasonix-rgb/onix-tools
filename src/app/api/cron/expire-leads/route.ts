import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { AssignmentDoc, isAssignmentActive } from "@/lib/types";

/**
 * Cron diario (ver vercel.json) — limpieza de asignaciones expiradas.
 *
 * IMPORTANTE: esto es una RED DE SEGURIDAD, no el mecanismo principal de
 * liberación. GET /api/leads ya hace verificación LAZY en cada lectura: si
 * una asignación expiró, se trata como libre en la respuesta al instante,
 * sin esperar a este cron. Lo que la verificación lazy NO hace es escribir
 * en Firestore — el doc sigue diciendo "asignado" hasta que algo lo
 * actualice físicamente. Si ningún vendedor vuelve a mirar ESE lead
 * concreto, quedaría con estado incorrecto en la base de datos de forma
 * indefinida (aunque invisible para efectos prácticos, porque la lectura
 * lazy ya lo trata como libre).
 *
 * Este cron corrige eso una vez al día: recorre TODAS las asignaciones con
 * estado activo (asignado/contactado/interesado) y libera físicamente las
 * que ya expiraron. Con el plan gratuito de Vercel (Hobby), el cron solo
 * puede correr una vez al día — se acepta la ventana de hasta ~24h entre
 * que un lead expira "de hecho" y que su doc se corrige físicamente,
 * porque la verificación lazy ya cubre cualquier caso donde SÍ hay
 * interacción real con ese lead en ese tiempo.
 *
 * "vendido" nunca se toca — no expira, no se libera, es historial
 * permanente (regla de negocio confirmada explícitamente).
 */
export async function GET(req: NextRequest) {
  // El endpoint de cron es una URL PÚBLICA — cualquiera en internet puede
  // hacerle un GET directamente. La cabecera que manda Vercel
  // (x-vercel-cron-schedule) NO es una barrera de seguridad porque
  // cualquier cliente puede falsificarla también. La única protección real
  // es comparar el header Authorization contra CRON_SECRET, que solo
  // conocen Vercel (se lo pasa automáticamente en cada invocación
  // programada) y este servidor.
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    console.error("CRON_SECRET no configurado — el cron no puede autenticarse, abortando.");
    return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 500 });
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const snapshot = await adminDb
    .collection("assignments")
    .where("status", "in", ["asignado", "contactado", "interesado"])
    .get();

  let releasedCount = 0;
  const now = new Date().toISOString();

  // Se procesa en lotes (batch) de Firestore en vez de una escritura por
  // documento, para que la operación sea eficiente incluso con miles de
  // asignaciones activas a la vez.
  const BATCH_SIZE = 400; // margen bajo el límite de 500 operaciones/batch de Firestore
  let batch = adminDb.batch();
  let opsInBatch = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data() as AssignmentDoc;
    if (isAssignmentActive(data)) continue; // sigue vigente, no tocar

    batch.update(doc.ref, {
      status: "liberado",
      history: [
        ...data.history,
        { status: "liberado", at: now, by: "system-cron", byName: "Sistema (expiración automática)" },
      ],
    });
    releasedCount += 1;
    opsInBatch += 1;

    if (opsInBatch >= BATCH_SIZE) {
      await batch.commit();
      batch = adminDb.batch();
      opsInBatch = 0;
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
  }

  return NextResponse.json({
    ok: true,
    checked: snapshot.size,
    released: releasedCount,
    at: now,
  });
}
