import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getPlatformConfig, setPlatformConfig } from "@/lib/config";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (err) {
    return adminAuthError(err);
  }

  const config = await getPlatformConfig();
  return NextResponse.json({ config });
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (err) {
    return adminAuthError(err);
  }

  const body = await req.json().catch(() => null);
  const visibleLeadsWindow = body?.visibleLeadsWindow as number | undefined;

  if (
    visibleLeadsWindow !== undefined &&
    (typeof visibleLeadsWindow !== "number" || visibleLeadsWindow < 1 || !Number.isInteger(visibleLeadsWindow))
  ) {
    return NextResponse.json(
      { error: "visibleLeadsWindow debe ser un número entero mayor que 0" },
      { status: 400 }
    );
  }

  const updated = await setPlatformConfig({ visibleLeadsWindow });
  return NextResponse.json({ config: updated });
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
