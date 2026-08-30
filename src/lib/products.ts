// Catálogo de productos — FIJO por decisión de negocio.
//
// A partir de ahora NO existe el concepto de "sector" como entidad de la
// plataforma: solo hay dos productos reales, Camarero Digital y CitaManager.
// El campo "tipo de negocio" que traen los leads (Bar Restaurante, Peluquería,
// Gimnasio Boutique...) es un dato informativo dentro de la ficha del lead —
// ayuda al vendedor a adaptar el discurso — pero NUNCA aparece como nombre de
// producto ni organiza la navegación.
//
// Relación producto → CSV NO es 1 a 1: Camarero Digital solo se vende a
// hostelería (1 CSV). CitaManager se vende a varios tipos de negocio
// (peluquerías, estéticas, mecánicos, fisios...) y puede alimentarse de
// varios CSV a la vez — por eso csvFiles es un array incluso hoy que solo
// tiene un elemento cada uno.

import { Product, ProductId } from "@/lib/types";

export const PRODUCTS: Product[] = [
  {
    id: "camarero-digital",
    name: "Camarero Digital",
    description:
      "App de comandas y gestión de sala para bares y restaurantes: pedidos desde la mesa, cocina sincronizada en tiempo real y menos idas y venidas de los camareros.",
    precio: "49€/mes",
    caracteristicas: [
      "Pedido directo desde la mesa (QR o tablet)",
      "Pantalla de cocina (KDS) sincronizada al instante",
      "Gestión de mesas y turnos",
      "Sin permanencia, cancelable en cualquier momento",
    ],
    enlaceInfo: null,
    duracionPruebaDias: 14,
    condicionesVenta:
      "Prueba gratuita de 14 días sin tarjeta. Tras la prueba, suscripción mensual o pago único según el plan que elija el cliente.",
    comisionPorcentaje: 40,
    activo: true,
    csvFiles: ["leads-hosteleria-bcn.csv"],
  },
  {
    id: "citamanager",
    name: "CitaManager",
    description:
      "Sistema de reservas y agenda online para negocios de servicios: peluquerías, centros de estética, talleres mecánicos, fisioterapeutas y similares. El cliente reserva solo, sin llamadas.",
    precio: "39€/mes",
    caracteristicas: [
      "Reservas online 24/7 sin llamadas",
      "Recordatorios automáticos al cliente",
      "Agenda multi-empleado",
      "Sin permanencia, cancelable en cualquier momento",
    ],
    enlaceInfo: null,
    duracionPruebaDias: 14,
    condicionesVenta:
      "Prueba gratuita de 14 días sin tarjeta. Tras la prueba, suscripción mensual o pago único según el plan que elija el cliente.",
    comisionPorcentaje: 40,
    activo: true,
    csvFiles: ["leads-gimnasios-bcn.csv"],
  },
];

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function getActiveProducts(): Product[] {
  return PRODUCTS.filter((p) => p.activo);
}

export function isValidProductId(id: string): id is ProductId {
  return PRODUCTS.some((p) => p.id === id);
}
