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
 */
export function calculateCommission(
  product: Pick<Product, "comisionPorcentaje">,
  importe: number
): { comisionPorcentaje: number; comisionImporte: number } {
  const comisionPorcentaje = product.comisionPorcentaje;
  const comisionImporte = Math.round(importe * (comisionPorcentaje / 100) * 100) / 100;
  return { comisionPorcentaje, comisionImporte };
}
