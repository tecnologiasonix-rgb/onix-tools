import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export type AuthedUser = {
  uid: string;
  email: string;
  name: string;
};

/**
 * Extrae y verifica el ID token de Firebase que el cliente manda en el
 * header Authorization: Bearer <token>. Lanza si no es válido.
 */
export async function requireUser(req: NextRequest): Promise<AuthedUser> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    throw new Error("UNAUTHENTICATED");
  }

  const decoded = await adminAuth.verifyIdToken(token);

  return {
    uid: decoded.uid,
    email: decoded.email ?? "",
    name: decoded.name ?? decoded.email ?? "Usuario",
  };
}
