import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/auth-server";
import { UserDoc, UserRole, UserStatus } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (err) {
    return adminAuthError(err);
  }

  const snapshot = await adminDb.collection("users").orderBy("createdAt", "desc").get();
  const users = snapshot.docs.map((doc) => doc.data() as UserDoc);

  return NextResponse.json({ users });
}

export async function PATCH(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    return adminAuthError(err);
  }

  const body = await req.json().catch(() => null);
  const targetUid = body?.uid as string | undefined;
  const newRole = body?.role as UserRole | undefined;
  const newStatus = body?.status as UserStatus | undefined;

  if (!targetUid) {
    return NextResponse.json({ error: "Falta uid" }, { status: 400 });
  }
  if (newRole && !["vendedor", "admin"].includes(newRole)) {
    return NextResponse.json({ error: "Rol no válido" }, { status: 400 });
  }
  if (newStatus && !["activo", "bloqueado"].includes(newStatus)) {
    return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
  }

  // Protección: un admin no puede bloquearse a sí mismo ni quitarse el rol
  // de admin a sí mismo. Sin esto, sería posible que el único admin de la
  // plataforma se autobloqueara por error y dejara el sistema sin nadie
  // capaz de deshacerlo — un admin bloqueado ya no pasa requireAdmin, así
  // que ni siquiera podría revertir su propio error desde este mismo panel.
  if (targetUid === admin.uid) {
    if (newStatus === "bloqueado") {
      return NextResponse.json({ error: "No puedes bloquearte a ti mismo" }, { status: 400 });
    }
    if (newRole === "vendedor") {
      return NextResponse.json(
        { error: "No puedes quitarte el rol de admin a ti mismo" },
        { status: 400 }
      );
    }
  }

  const docRef = adminDb.collection("users").doc(targetUid);
  const snap = await docRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const patch: Partial<UserDoc> = {};
  if (newRole) patch.role = newRole;
  if (newStatus) patch.status = newStatus;

  await docRef.update(patch);
  const updated = { ...(snap.data() as UserDoc), ...patch };

  return NextResponse.json({ user: updated });
}

function adminAuthError(err: unknown) {
  const message = err instanceof Error ? err.message : "Error";
  if (message === "FORBIDDEN") {
    return NextResponse.json({ error: "Requiere permisos de administrador" }, { status: 403 });
  }
  if (message === "BLOCKED") {
    return NextResponse.json({ error: "Tu cuenta ha sido bloqueada" }, { status: 403 });
  }
  return NextResponse.json({ error: "No autenticado" }, { status: 401 });
}
