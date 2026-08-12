import type { Metadata, Viewport } from "next";
import { AvisoDeConexao, RegistroDoServiceWorker } from "@/components/pwa";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Pincel & Guia Admin",
    template: "%s | Pincel & Guia Admin",
  },
  description: "Painel administrativo da Pincel & Guia.",
  manifest: "/manifest.webmanifest",
  applicationName: "Pincel & Guia Admin",
  appleWebApp: {
    capable: true,
    title: "P&G Admin",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  // Painel nunca deve ser indexado — reforça o header X-Robots-Tag.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#33251F",
  width: "device-width",
  initialScale: 1,
  // Painel usado no celular: evita o zoom automático ao focar campo,
  // sem impedir o zoom manual de quem precisa dele.
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AvisoDeConexao />
        {children}
        <RegistroDoServiceWorker />
      </body>
    </html>
  );
}
