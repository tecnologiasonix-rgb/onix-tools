// Nombre de marca de la plataforma pública de vendedores.
// PROVISIONAL: el usuario ha confirmado que podría cambiar (ej. a
// "OnixJob"). Se referencia esta única constante en vez de escribir el
// nombre a mano en cada archivo — así un cambio de marca es una línea, no
// una búsqueda y reemplazo por todo el proyecto.
export const APP_NAME = "OnixWork";
export const APP_TAGLINE = "Vende, haz seguimiento y cobra tu comisión.";

/**
 * DECISIÓN DE NEGOCIO PENDIENTE (confirmado explícitamente por el usuario:
 * "no lo sé con certeza aún, quiero pensarlo"): a dónde debe redirigir
 * /r/[code] tras registrar el evento de referido.
 *
 * Las dos opciones reales sobre la mesa son:
 *   (a) directo a la página de pago externa (repo nº3, aún sin URL ni
 *       protocolo de cómo recibe el código de referido)
 *   (b) a la web de info/demo del producto (repos nº1/nº2) primero, y el
 *       cliente navega por su cuenta hacia el pago después
 *
 * Mientras se decide, se usa un placeholder por producto — así el sistema
 * de tracking (lo que de verdad importa: registrar quién generó el clic)
 * funciona ya, y el día que se decida el destino real, el cambio es
 * ÚNICAMENTE este objeto, sin tocar la lógica de /r/[code].
 */
export const REFERRAL_FALLBACK_URLS: Record<string, string> = {
  "camarero-digital": "https://camarerodigital.example.com",
  citamanager: "https://citamanager.example.com",
};
