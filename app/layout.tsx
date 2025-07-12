import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import WhatsAppButton from "./components/WhatsAppButton"; // <-- IMPORTADO
import React from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ecuaforma - Cursos y Simuladores para Fuerzas Armadas y Policía",
  description: "Prepárate con nuestros cursos y simuladores para ingresar a la FAE, Armada, Ejército y Policía Nacional del Ecuador.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-grow py-8 sm:py-12">
            {children}
          </main>
          <Footer />
        </div>
        <WhatsAppButton /> {/* <-- AÑADIDO */}
      </body>
    </html>
  );
}