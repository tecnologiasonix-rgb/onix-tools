import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter/wght.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700.css";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const APP_NAME = "Onix Leads";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: "Onix Leads — Gestor de Leads",
    template: `%s · ${APP_NAME}`,
  },
  description:
    "Panel interno de Tecnologías Onix para repartir, gestionar y cerrar leads en equipo.",
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
    statusBarStyle: "default",
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
  themeColor: "#1557f0",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col text-neutral-900">
        <div className="app-ambient-bg" aria-hidden="true" />
        <ServiceWorkerRegister />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
