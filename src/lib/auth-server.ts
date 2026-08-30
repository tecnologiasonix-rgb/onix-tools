import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { UserRole, UserStatus } from "@/lib/types";

export type AuthedUser = {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  referralCode: string;
};

/**
 * Extrae y verifica el ID token de Firebase (header Authorization: Bearer),
 * y luego carga el perfil (users/{uid}) para adjuntar rol y estado.
 *
 * Lanza si:
 *   - No hay token o no es válido (UNAUTHENTICATED)
 *   - El perfil no existe aún en Firestore (NO_PROFILE) — pasa justo tras el
 *     registro, antes de que se cree el doc de usuario; el caller decide si
 *     eso es un error o el momento de crearlo.
 *   - El usuario está bloqueado por un admin (BLOCKED) — se comprueba en
 *     CADA petición, no solo al hacer login, así un bloqueo surte efecto
 *     de inmediato aunque el navegador aún tenga un token válido sin expirar.
 */
export async function requireUser(req: NextRequest): Promise<AuthedUser> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    throw new Error("UNAUTHENTICATED");
  }

  const decoded = await adminAuth.verifyIdToken(token);

  const profileSnap = await adminDb.collection("users").doc(decoded.uid).get();
  if (!profileSnap.exists) {
    throw new Error("NO_PROFILE");
  }
  const profile = profileSnap.data() as {
    role: UserRole;
    status: UserStatus;
    displayName: string;
    referralCode: string;
  };

  if (profile.status === "bloqueado") {
    throw new Error("BLOCKED");
  }

  return {
    uid: decoded.uid,
    email: decoded.email ?? "",
    name: profile.displayName || decoded.email || "Usuario",
    role: profile.role,
    status: profile.status,
    referralCode: profile.referralCode,
  };
}

/** Igual que requireUser, pero además exige rol admin. */
export async function requireAdmin(req: NextRequest): Promise<AuthedUser> {
  const user = await requireUser(req);
  if (user.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return user;
}
