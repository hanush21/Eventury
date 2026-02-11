import type { Metadata } from "next";

import { Toaster } from "@/shared/ui/shadcn/sonner";

import "./globals.css";

export const metadata: Metadata = {
  title: "Eventury Barcelona",
  description: "Aplicacion para generar itinerarios de eventos en Barcelona con IA.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
