import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import WhatsAppButton from "./components/WhatsAppButton";
import AuthProvider from "./components/AuthProvider"; // <-- IMPORTADO
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"; // <-- IMPORTADO
import { cookies } from "next/headers"; // <-- IMPORTADO
import React from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ecuaforma - Cursos y Simuladores para Fuerzas Armadas y Policía",
  description: "Prepárate con nuestros cursos y simuladores para ingresar a la FAE, Armada, Ejército y Policía Nacional del Ecuador.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Obtenemos la sesión del lado del servidor para pasarla al AuthProvider
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider session={session}> {/* <-- ENVOLVEMOS LA APP */}
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow py-8 sm:py-12">
              {children}
            </main>
            <Footer />
          </div>
          <WhatsAppButton />
        </AuthProvider>
      </body>
    </html>
  );
}