import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { generateReferralCode } from "@/lib/referral";
import { UserDoc } from "@/lib/types";

/**
 * Crea el perfil de usuario en Firestore (users/{uid}) la PRIMERA vez que
 * se ve ese uid, con rol "vendedor" y un código de referido único.
 *
 * DECISIÓN DE SEGURIDAD CLAVE: el rol y el código de referido los decide
 * SIEMPRE el servidor, nunca el body de la petición. El cliente solo puede
 * mandar displayName (texto libre, cosmético). Así es estructuralmente
 * imposible que alguien se registre como admin manipulando la petición
 * desde el navegador — no hay ningún campo "role" que el frontend controle.
 *
 * Idempotente: si el perfil ya existe, no lo toca (evita pisar el rol de un
 * admin o el estado "bloqueado" de un usuario en cada login).
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const displayName =
    typeof body?.displayName === "string" && body.displayName.trim()
      ? body.displayName.trim().slice(0, 120)
      : decoded.email || "Usuario";

  const docRef = adminDb.collection("users").doc(decoded.uid);

  const result = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (snap.exists) {
      return snap.data() as UserDoc;
    }

    const newProfile: UserDoc = {
      uid: decoded.uid,
      email: decoded.email ?? "",
      displayName,
      role: "vendedor", // SIEMPRE por defecto, nunca decidido por el cliente
      status: "activo",
      referralCode: generateReferralCode(decoded.uid),
      createdAt: new Date().toISOString(),
    };
    tx.set(docRef, newProfile);
    return newProfile;
  });

  return NextResponse.json({ profile: result });
}
