import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter/wght.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700.css";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider, ThemeScript } from "@/lib/theme-context";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: `${APP_NAME} — Plataforma de vendedores`,
    template: `%s · ${APP_NAME}`,
  },
  description: `${APP_TAGLINE} Plataforma de Tecnologías Onix para vender Camarero Digital y CitaManager.`,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", // coherente con arranque en tema oscuro
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Dos entradas: el navegador/PWA usa la que coincide con el tema activo
  // de verdad en cada momento (el color de la barra de estado del móvil
  // también debe seguir al tema, no quedar fijo en el azul de marca cuando
  // el vendedor está en modo oscuro).
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0e14" },
    { media: "(prefers-color-scheme: light)", color: "#1557f0" },
  ],
  // Sin colorScheme fijo aquí: lo decide data-theme en <html>, aplicado por
  // ThemeScript antes del primer paint (ver src/lib/theme-context.tsx).
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col text-[var(--foreground)]">
        <div className="app-ambient-bg" aria-hidden="true" />
        <ServiceWorkerRegister />
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
