import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import 'katex/dist/katex.min.css'; // <-- ESTILOS PARA MATEMÁTICAS
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import WhatsAppButton from "./components/WhatsAppButton";
import AuthProvider from "./components/AuthProvider";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
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
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider session={session}>
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
