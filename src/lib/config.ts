import { adminDb } from "@/lib/firebase-admin";
import { DEFAULT_VISIBLE_LEADS_WINDOW, PlatformConfig } from "@/lib/types";

const CONFIG_DOC = adminDb.collection("config").doc("platform");

/**
 * Lee la configuración editable por admin. Si el documento aún no existe
 * (plataforma recién desplegada, nadie ha tocado ajustes todavía), devuelve
 * el default de fábrica sin lanzar error — la plataforma debe funcionar
 * correctamente desde el primer día sin exigir configuración manual previa.
 */
export async function getPlatformConfig(): Promise<PlatformConfig> {
  const snap = await CONFIG_DOC.get();
  if (!snap.exists) {
    return { visibleLeadsWindow: DEFAULT_VISIBLE_LEADS_WINDOW };
  }
  const data = snap.data() as Partial<PlatformConfig>;
  return {
    visibleLeadsWindow:
      typeof data.visibleLeadsWindow === "number" && data.visibleLeadsWindow > 0
        ? data.visibleLeadsWindow
        : DEFAULT_VISIBLE_LEADS_WINDOW,
  };
}

/** Solo debe llamarse desde una ruta que ya haya verificado requireAdmin. */
export async function setPlatformConfig(patch: Partial<PlatformConfig>): Promise<PlatformConfig> {
  const current = await getPlatformConfig();
  const updated: PlatformConfig = { ...current, ...patch };
  await CONFIG_DOC.set(updated, { merge: true });
  return updated;
}
