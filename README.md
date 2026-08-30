# Gestor de Leads

Herramienta interna para repartir y gestionar leads entre un equipo de
ventas. Login con Google, selección de producto (cada producto = un CSV),
asignación de leads por 72 horas, cambio de estado y registro de ventas.

Stack: **Next.js** (Vercel, plan free) + **Firebase Auth** (login Google) +
**Firestore** (plan free, "Spark") para guardar el estado de cada lead. Los
leads en sí NO se guardan en base de datos: se leen directamente de los CSV
que subes al repo.

---

## 1. Cómo funciona (resumen)

- Cada **producto** es un archivo CSV en `/data`. Añadir un producto nuevo
  = subir un CSV + añadir una línea en `src/lib/products.ts`.
- Cuando un usuario **selecciona un lead**, se crea una "asignación" en
  Firestore con una validez de **72 horas**.
- **Mientras un lead está asignado, todo el equipo lo ve como "ocupado"**
  (con el nombre de quién lo tiene) para que nadie más lo contacte. Solo el
  dueño de la asignación puede actuar sobre él.
- El dueño puede marcarlo como **contactado**, **interesado** o **vendido**.
  Al marcarlo como vendido debe rellenar datos verificables: tipo de pago
  (suscripción mensual / pago único), importe, referencia de pago y
  fecha/hora exacta del cobro.
- Si pasan 72 horas sin que se marque como vendido, el lead **vuelve a
  estar disponible** automáticamente para cualquiera.
- Un lead **vendido queda fijado** para siempre a esa venta (no se libera).

---

## 2. Requisitos

- Cuenta de [Firebase](https://console.firebase.google.com) (gratis)
- Cuenta de [Vercel](https://vercel.com) (gratis)
- Cuenta de [GitHub](https://github.com) (gratis)
- Node.js 20+ instalado en tu ordenador (solo si quieres probarlo en local)

---

## 3. Configurar Firebase (una sola vez)

### 3.1 Crear el proyecto

1. Ve a [console.firebase.google.com](https://console.firebase.google.com) → **Crear un proyecto**.
2. Ponle un nombre (ej. `gestor-leads`). Puedes desactivar Google Analytics, no hace falta.

### 3.2 Activar el login con Google

1. En el menú lateral: **Compilación (Build) → Authentication**.
2. Pestaña **Sign-in method** → habilita **Google**.
3. Elige un email de soporte y guarda.

### 3.3 Crear la base de datos Firestore

1. Menú lateral: **Compilación (Build) → Firestore Database → Crear base de datos**.
2. Elige el modo **producción** (ya traemos reglas de seguridad seguras).
3. Elige la región más cercana a tus usuarios (ej. `eur3` para Europa).

### 3.4 Obtener las claves para el navegador (públicas)

1. Icono de engranaje ⚙️ → **Configuración del proyecto**.
2. Baja hasta "Tus apps" → icono **`</>`** (Web) → registra una app (nombre libre, sin Hosting).
3. Copia el bloque `firebaseConfig` — lo necesitarás en el paso 5.

### 3.5 Obtener la clave del servidor (privada, ¡no la compartas!)

1. Configuración del proyecto → pestaña **Cuentas de servicio**.
2. Botón **Generar nueva clave privada** → descarga un archivo `.json`.
3. Ábrelo: necesitarás los campos `project_id`, `client_email` y
   `private_key`. Los usarás en el paso 5. **Este archivo no se sube nunca
   a GitHub.**

### 3.6 Autorizar el dominio de Vercel

Cuando despliegues en Vercel (paso 6), tendrás una URL como
`tu-app.vercel.app`. Añádela en:
**Authentication → Settings → Authorized domains → Add domain**.
(`localhost` ya viene autorizado por defecto para pruebas en local.)

---

## 4. Subir el proyecto a GitHub

```bash
cd leads-manager
git init
git add .
git commit -m "Gestor de leads inicial"
```

Crea un repositorio nuevo en GitHub (vacío, sin README) y sigue las
instrucciones que te da GitHub para conectar tu carpeta local, por ejemplo:

```bash
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git branch -M main
git push -u origin main
```

---

## 5. Variables de entorno

Copia `.env.example` a `.env.local` y rellena los valores con lo que
obtuviste en el paso 3:

```bash
cp .env.example .env.local
```

- Las variables `NEXT_PUBLIC_FIREBASE_*` salen del bloque `firebaseConfig`
  (paso 3.4).
- Las variables `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` y
  `FIREBASE_PRIVATE_KEY` salen del JSON descargado (paso 3.5).
- Para `FIREBASE_PRIVATE_KEY`: copia el valor completo del JSON tal cual
  (incluye las `\n` literales), entre comillas dobles.

`.env.local` está en `.gitignore`: nunca se sube a GitHub.

### Probar en local (opcional)

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

---

## 6. Desplegar en Vercel

1. Ve a [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → elige tu repo.
2. En **Environment Variables**, añade las mismas variables que pusiste en
   `.env.local` (una por una, o pega el `.env.local` completo si Vercel te
   da esa opción).
3. Click **Deploy**. En 1-2 minutos tendrás tu URL (`tu-app.vercel.app`).
4. Vuelve a Firebase → Authentication → Settings → Authorized domains y
   añade esa URL (paso 3.6).

Cada vez que hagas `git push`, Vercel vuelve a desplegar automáticamente.

---

## 7. Aplicar las reglas de seguridad de Firestore

El archivo `firestore.rules` bloquea todo acceso directo desde el
navegador (todo pasa por el servidor de Next.js, que usa credenciales
privadas). Para aplicarlo:

1. Firebase Console → Firestore Database → pestaña **Reglas**.
2. Pega el contenido de `firestore.rules` de este proyecto.
3. Publica.

---

## 8. Añadir un producto nuevo

1. Prepara tu CSV con estas columnas exactas (en este orden):
   ```
   nombre,pais,ciudad_zona,direccion,telefono,email,web,tipo,cp,estado_origen,notas
   ```
   Si algún campo contiene comas, ponlo entre comillas dobles: `"Calle Mayor, 5"`.
2. Guárdalo en `/data/tu-archivo.csv`.
3. Abre `src/lib/products.ts` y añade una entrada nueva:
   ```ts
   {
     id: "mi-producto",           // slug único, sin espacios
     name: "Mi Producto",         // lo que ve el usuario
     description: "Descripción corta.",
     csvFile: "tu-archivo.csv",
   },
   ```
4. `git add . && git commit -m "Nuevo producto" && git push` — Vercel
   despliega solo.

---

## 9. Límites del plan gratuito a tener en cuenta

- **Firestore (Spark/free)**: 50.000 lecturas/día, 20.000 escrituras/día,
  1 GB almacenamiento. Con equipos pequeños/medianos es más que suficiente
  — cada carga de la lista de leads de un producto cuenta como 1 lectura
  por *asignación existente* (no por lead del CSV).
- **Vercel (Hobby/free)**: 100 GB de ancho de banda/mes, suficiente para
  uso interno de equipo.
- **Firebase Auth**: login con Google es gratis sin límite práctico para
  este caso de uso.

Si en el futuro el equipo crece mucho, estos límites pueden alcanzarse;
en ese caso Firebase/Vercel piden pasar a un plan de pago solo por lo que
excedas.

---

## 10. Estructura del proyecto

```
data/                          CSVs de cada producto (leads)
firestore.rules                Reglas de seguridad de Firestore
src/
  lib/
    products.ts                 Catálogo de productos → CSV
    csv.ts                      Lectura y parseo de CSV
    assignments.ts               Modelo de datos y reglas de negocio (72h, transiciones)
    firebase-client.ts           Firebase Auth (navegador)
    firebase-admin.ts            Firebase Admin (servidor)
    auth-context.tsx             Contexto de React para login
    auth-server.ts               Verificación de token en API routes
    api-client.ts                Helper de fetch autenticado
  app/
    page.tsx                     Selección de producto
    producto/[productId]/        Lista de leads del producto
    mis-leads/                   Leads asignados al usuario actual
    api/leads/                   GET leads + estado de asignación
    api/leads/select/            POST seleccionar/asignarse un lead
    api/leads/status/            POST cambiar estado / registrar venta
    api/my-leads/                GET leads del usuario actual
  components/
    Header.tsx                   Barra superior (login/logout)
    LeadCard.tsx                  Tarjeta de lead con acciones
    SaleForm.tsx                  Formulario de registro de venta
```
