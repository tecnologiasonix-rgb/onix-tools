import { Product } from "@/lib/types";

/**
 * Calcula la comisión de una venta EN EL MOMENTO en que se registra.
 *
 * Esta plataforma solo trabaja con pago único (decisión de negocio
 * confirmada explícitamente: la suscripción mensual con comisión recurrente
 * se planteó y se descartó por depender de una integración de pagos externa
 * que hoy no existe — ver el comentario en SaleInfo, en src/lib/types.ts).
 * Por eso este cálculo ya no tiene ninguna condición sobre el tipo de pago.
 *
 * El % se lee del producto EN ESTE INSTANTE y se guarda congelado en el
 * propio registro de venta (SaleInfo.comisionPorcentaje). Si el % del
 * producto cambia después, esta venta ya registrada NO se recalcula: el %
 * antiguo se mantiene, el nuevo solo aplica a ventas futuras.
 *
 * LIMITACIÓN CONOCIDA (multi-moneda): esta función NO convierte divisas — la
 * comisión sale en las mismas unidades que `importe`, sea EUR o USD. Los
 * paneles de admin (admin/ventas, admin/page) sí AGRUPAN el importe bruto
 * por moneda, pero suman `comisionImporte` de todas las ventas junto y lo
 * muestran con el símbolo € fijo, sin distinguir su moneda de origen. Si el
 * equipo empieza a vender de verdad en USD, ese total de comisión dejará de
 * ser correcto. No se ha resuelto aquí porque requiere una decisión de
 * negocio explícita (¿la comisión se paga siempre en EUR a un tipo de
 * cambio? ¿en la misma moneda que la venta?) que no está definida todavía.
 */
export function calculateCommission(
  product: Pick<Product, "comisionPorcentaje">,
  importe: number
): { comisionPorcentaje: number; comisionImporte: number } {
  const comisionPorcentaje = product.comisionPorcentaje;
  const comisionImporte = Math.round(importe * (comisionPorcentaje / 100) * 100) / 100;
  return { comisionPorcentaje, comisionImporte };
}
