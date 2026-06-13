"use client";

import React, { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

export default function CheckoutPage() {
  // Aquí luego pasaremos el precio real y los datos del curso
  const precio = "50.00"; 
  const [loadingPayPhone, setLoadingPayPhone] = useState(false);

  // Configuración para el botón de WhatsApp (Transferencia)
  const numeroWhatsApp = "593992893010";
  const mensaje = `Hola Ecuaforma, deseo realizar el pago por transferencia bancaria por el valor de $${precio}.`;
  const linkWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;

  const handlePayPhoneClick = async () => {
    setLoadingPayPhone(true);
    // Aquí conectaremos nuestra API de PayPhone en el siguiente paso
    console.log("Iniciando pago con PayPhone...");
    // Simulamos un tiempo de carga por ahora
    setTimeout(() => setLoadingPayPhone(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex justify-center">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6">
        
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Finalizar Compra</h2>
          <p className="text-gray-500 mt-2">Total a pagar: <span className="font-bold text-green-600">${precio}</span></p>
        </div>

        <div className="space-y-4 mt-8">
          
          {/* BOTÓN 1: PAYPHONE (Tarjetas Locales) */}
          <button
            onClick={handlePayPhoneClick}
            disabled={loadingPayPhone}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors disabled:opacity-70"
          >
            {loadingPayPhone ? "Cargando..." : "Pagar con Tarjeta de Crédito/Débito"}
          </button>

          {/* BOTÓN 2: TRANSFERENCIA (WhatsApp) */}
          <a
            href={linkWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            Transferencia o Depósito (WhatsApp)
          </a>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">o paga internacionalmente con</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          {/* BOTÓN 3: PAYPAL (Internacional) */}
          <div className="w-full z-0 relative">
            <PayPalScriptProvider 
              options={{ 
                clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test",
                currency: "USD",
                intent: "capture"
              }}
            >
              <PayPalButtons 
                style={{ layout: "vertical", shape: "rect", color: "blue" }}
                createOrder={(data, actions) => {
                  return actions.order.create({
                    intent: "CAPTURE",
                    purchase_units: [
                      {
                        amount: {
                          currency_code: "USD",
                          value: precio,
                        },
                        description: "Acceso a Ecuaforma",
                      },
                    ],
                  });
                }}
                onApprove={async (data, actions) => {
                  if (actions.order) {
                    const details = await actions.order.capture();
                    alert(`¡Pago completado por ${details.payer?.name?.given_name}! Pronto daremos acceso a tu cuenta.`);
                    // Aquí luego guardaremos en la base de datos que el usuario ya pagó
                  }
                }}
              />
            </PayPalScriptProvider>
          </div>

        </div>
      </div>
    </div>
  );
}