import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./fluuix.css";
import "./demo.css";
import "./rail.css";
import "./intercompany.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fluuix · Treasury Rail — Muchas empresas. Una sola caja.",
  description: "La tesorería de todo tu grupo en pesos digitales. Mové capital entre empresas del grupo en ARGt, registrá préstamos y aportes intercompany y explorá recomendaciones para la caja ociosa.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
