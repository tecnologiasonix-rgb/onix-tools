import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { referralDocId, ReferralDoc } from "@/lib/types";
import { REFERRAL_FALLBACK_URLS } from "@/lib/brand";

/**
 * Ruta pública de tracking: GET /r/[code]?lead=LEADID
 *
 * Esta es la pieza real de atribución del sistema de referidos — el
 * evento que importa registrar es "alguien pulsó el enlace de este
 * vendedor para este lead", independientemente de a dónde se le redirija
 * después. Por eso el registro ocurre AQUÍ, antes de decidir destino, y no
 * depende de que el destino final ya esté decidido (ver comentario en
 * REFERRAL_FALLBACK_URLS sobre la decisión de negocio pendiente).
 *
 * No requiere autenticación: quien pulsa el enlace es el CLIENTE potencial,
 * no el vendedor — nunca tendrá una sesión de OnixWork.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const leadId = req.nextUrl.searchParams.get("lead");

  // Sin leadId no hay nada que atribuir de forma fiable — el código por sí
  // solo no basta (ver el comentario sobre la clave compuesta en
  // referralDocId, en src/lib/types.ts). Se redirige a la home en vez de
  // dar un error visible a un cliente real que no tiene por qué entender
  // el fallo interno.
  if (!code || !leadId) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const docRef = adminDb.collection("referrals").doc(referralDocId(code, leadId));
  const snap = await docRef.get();

  let productId: string | null = null;

  if (snap.exists) {
    const referral = snap.data() as ReferralDoc;
    productId = referral.productId;
    // Solo se marca firstContactAt la PRIMERA vez — si el cliente pulsa el
    // enlace varias veces, no se pisa la fecha del primer contacto real.
    if (!referral.firstContactAt) {
      await docRef.update({ firstContactAt: new Date().toISOString() });
    }
  }
  // Si el documento no existe (código inválido, o el vendedor nunca generó
  // este referido concreto desde /api/leads/generate-referral), se
  // redirige igualmente sin registrar nada — un código inventado o mal
  // copiado no debe poder crear un referral fantasma desde el lado del
  // cliente. La creación SIEMPRE pasa por el endpoint autenticado.

  const fallback = productId ? REFERRAL_FALLBACK_URLS[productId] : null;
  return NextResponse.redirect(fallback ?? new URL("/", req.url));
}
