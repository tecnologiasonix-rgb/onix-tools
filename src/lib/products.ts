// Catálogo de productos. Cada producto apunta a un CSV dentro de /data.
// Para añadir un producto nuevo:
//   1. Sube tu CSV a /data/tu-archivo.csv (mismas columnas que los ejemplos)
//   2. Añade una entrada aquí abajo con un "id" único (slug, sin espacios)
//   3. Haz commit y push — Vercel despliega solo

export type Product = {
  id: string; // slug único, usado en la URL /producto/[id]
  name: string; // nombre visible para el usuario
  description: string;
  csvFile: string; // nombre del archivo dentro de /data
};

export const PRODUCTS: Product[] = [
  {
    id: "hosteleria-bcn",
    name: "Hostelería Barcelona",
    description: "Bares, restaurantes y cafeterías de Barcelona.",
    csvFile: "leads-hosteleria-bcn.csv",
  },
  {
    id: "gimnasios-bcn",
    name: "Gimnasios y estudios Barcelona",
    description: "Gimnasios, boxes y centros de yoga de Barcelona.",
    csvFile: "leads-gimnasios-bcn.csv",
  },
];

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
