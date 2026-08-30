import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth-server";
import {
  assignmentDocId,
  referralDocId,
  AssignmentDoc,
  ReferralDoc,
  isAssignmentActive,
} from "@/lib/types";

/**
 * Genera (o recupera si ya existe) el enlace de referido de ESTE vendedor
 * para UN lead concreto que tiene asignado ahora mismo.
 *
 * Validación de servidor clave: solo se puede generar un referido para un
 * lead que el vendedor tiene realmente asignado y activo — así el código
 * nunca puede fabricarse para un lead ajeno o inexistente. El código en sí
 * (user.referralCode) ya se decidió en servidor al registrarse, nunca por
 * el cliente (ver /api/auth/ensure-profile).
 */
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    if (message === "BLOCKED") {
      return NextResponse.json({ error: "Tu cuenta ha sido bloqueada" }, { status: 403 });
    }
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const productId = body?.productId as string | undefined;
  const leadId = body?.leadId as string | undefined;

  if (!productId || !leadId) {
    return NextResponse.json({ error: "Falta productId o leadId" }, { status: 400 });
  }

  // El vendedor debe tener este lead asignado y activo para generar un
  // referido sobre él — no se puede fabricar un enlace para un lead que no
  // se está trabajando de verdad.
  const assignmentRef = adminDb.collection("assignments").doc(assignmentDocId(productId as AssignmentDoc["productId"], leadId));
  const assignmentSnap = await assignmentRef.get();
  if (!assignmentSnap.exists) {
    return NextResponse.json({ error: "No tienes este lead asignado" }, { status: 403 });
  }
  const assignment = assignmentSnap.data() as AssignmentDoc;
  if (assignment.userId !== user.uid) {
    return NextResponse.json({ error: "Este lead no está asignado a ti" }, { status: 403 });
  }
  if (!isAssignmentActive(assignment)) {
    return NextResponse.json({ error: "La asignación de este lead ya no está activa" }, { status: 410 });
  }

  const docId = referralDocId(user.referralCode, leadId);
  const referralRef = adminDb.collection("referrals").doc(docId);

  const existing = await referralRef.get();
  let referral: ReferralDoc;

  if (existing.exists) {
    referral = existing.data() as ReferralDoc;
  } else {
    referral = {
      code: user.referralCode,
      userId: user.uid,
      productId: productId as ReferralDoc["productId"],
      leadId,
      createdAt: new Date().toISOString(),
      firstContactAt: null,
      convertedAt: null,
      status: "activo",
    };
    await referralRef.set(referral);
    // La propia assignment también guarda qué código de referido se generó
    // para ella — es lo que status/route.ts consulta al cerrar la venta
    // para saber si hay un ReferralDoc que marcar como "convertido" en la
    // misma transacción atómica.
    await assignmentRef.update({ referralCode: user.referralCode });
  }

  return NextResponse.json({
    referral,
    url: `${req.nextUrl.origin}/r/${referral.code}?lead=${leadId}`,
  });
}
