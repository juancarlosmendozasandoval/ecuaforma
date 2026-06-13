"use client";

import React, { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useSearchParams } from "next/navigation";

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  
  // Leemos los datos de la URL. Si alguien entra directo, mostramos valores por defecto.
  const nombreItem = searchParams.get("nombre") || "Acceso Premium a Ecuaforma";
  const precio = searchParams.get("precio") || "50.00"; 
  
  const [loadingPayPhone, setLoadingPayPhone] = useState(false);

  // Configuración dinámica para el botón de WhatsApp
  const numeroWhatsApp = "593992893010";
  const mensaje = `Hola Ecuaforma, deseo realizar el pago por transferencia/depósito de $${precio} para inscribirme en: *${nombreItem}*. ¿Me ayudas con los datos de cuenta?`;
  const linkWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;

  const handlePayPhoneClick = async () => {
    setLoadingPayPhone(true);
    console.log(`Iniciando pago de $${precio} para ${nombreItem} con PayPhone...`);
    setTimeout(() => setLoadingPayPhone(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex justify-center items-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-8 border border-gray-100">
        
        {/* Cabecera del Checkout */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900">Resumen de Compra</h2>
          <p className="text-md text-gray-600">{nombreItem}</p>
          <div className="text-4xl font-black text-gray-900 pt-2">${precio} <span className="text-lg font-medium text-gray-500">USD</span></div>
        </div>

        <div className="space-y-4">
          
          {/* BOTÓN 1: PAYPHONE (Elegante) */}
          <button
            onClick={handlePayPhoneClick}
            disabled={loadingPayPhone}
            className="w-full flex items-center justify-center px-4 py-3.5 border border-transparent text-base font-semibold rounded-lg text-white bg-[#FF6B00] hover:bg-[#e66000] shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6B00] transition-all disabled:opacity-70"
          >
            {loadingPayPhone ? (
              "Procesando..."
            ) : (
              <>
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Pagar con Tarjeta Local
              </>
            )}
          </button>

          {/* BOTÓN 2: WHATSAPP (Elegante) */}
          <a
            href={linkWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center px-4 py-3.5 border border-gray-200 text-base font-semibold rounded-lg text-gray-800 bg-white hover:bg-gray-50 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all"
          >
            <svg className="w-6 h-6 mr-3 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            Transferencia o Depósito
          </a>

          {/* Divisor Visual */}
          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-semibold uppercase tracking-wider">Pago Internacional</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          {/* BOTÓN 3: PAYPAL */}
          <div className="w-full z-0 relative">
            <PayPalScriptProvider 
              options={{ 
                clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test",
                currency: "USD",
                intent: "capture"
              }}
            >
              <PayPalButtons 
                style={{ layout: "vertical", shape: "rect", color: "blue", label: "pay" }}
                createOrder={(data, actions) => {
                  return actions.order.create({
                    intent: "CAPTURE",
                    purchase_units: [{
                      amount: { currency_code: "USD", value: precio },
                      description: nombreItem,
                    }],
                  });
                }}
                onApprove={async (data, actions) => {
                  if (actions.order) {
                    const details = await actions.order.capture();
                    alert(`¡Pago completado por ${details.payer?.name?.given_name}! Te daremos acceso al curso: ${nombreItem}.`);
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