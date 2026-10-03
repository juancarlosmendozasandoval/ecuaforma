"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import AceptacionTerminos from "../components/AceptacionTerminos";

export interface CheckoutProps {
  /** Solo los cursos (con ID verificado en el servidor) pueden pagarse con PayPhone. */
  cursoId: string | null;
  nombreItem: string;
  precio: string;
  institucion: string;
  cancelado: boolean;
}

export default function CheckoutCliente({ cursoId, nombreItem, precio, institucion, cancelado }: CheckoutProps) {
  const [loadingPayPhone, setLoadingPayPhone] = useState(false);
  const [paypalOk, setPaypalOk] = useState(false);
  const [aceptado, setAceptado] = useState(false);
  const pagoIdRef = useRef<string | null>(null);
  const router = useRouter();

  const institucionTexto = institucion ? ` (${institucion})` : "";
  const numeroWhatsApp = "593992893010";
  const mensaje = `Hola Ecuaforma, deseo realizar el pago por transferencia/depósito de $${precio} para inscribirme en: *${nombreItem}*${institucionTexto}. ¿Me ayudas con los datos de cuenta?`;
  const linkWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;

  // 🌟 PayPhone: el cliente solo envía el ID del curso; el monto lo decide el servidor
  const handlePayPhoneClick = async () => {
    if (!cursoId || !aceptado) return;
    setLoadingPayPhone(true);
    
    try {
      const response = await fetch('/api/payphone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cursoId }),
      });

      const data = await response.json();

      if (data.url) {
        // Redirigimos al usuario a la ventana segura del banco
        window.location.href = data.url;
      } else {
        alert(data.error || "Hubo un problema generando el pago. Intenta de nuevo.");
        setLoadingPayPhone(false);
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión. Revisa tu internet.");
      setLoadingPayPhone(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex justify-center items-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-8 border border-gray-100">
        
        {cancelado && (
          <div className="p-3 rounded-xl text-sm font-medium bg-amber-50 border border-amber-200 text-amber-800">
            El pago fue cancelado. No se realizó ningún cobro; puedes intentarlo de nuevo.
          </div>
        )}

        {/* Cabecera del Checkout */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900">Resumen de Compra</h2>
          <p className="text-md text-gray-600 font-medium">{nombreItem} <span className="text-blue-600">{institucionTexto}</span></p>
          <div className="text-4xl font-black text-gray-900 pt-2">${precio} <span className="text-lg font-medium text-gray-500">USD</span></div>
        </div>

        <div className="space-y-4">

          <AceptacionTerminos aceptado={aceptado} onChange={setAceptado} />
          
          {/* BOTÓN 1: PAYPHONE (solo cursos verificados) */}
          {cursoId ? (
            <button
              onClick={handlePayPhoneClick}
              disabled={loadingPayPhone || !aceptado}
              className="w-full flex items-center justify-center px-4 py-3.5 border border-transparent text-base font-semibold rounded-lg text-white bg-[#FF6B00] hover:bg-[#e66000] shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6B00] transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#FF6B00] disabled:hover:shadow-md"
            >
              {loadingPayPhone ? (
                "Conectando con el banco..."
              ) : (
                <>
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Pagar con Tarjeta Local
                </>
              )}
            </button>
          ) : (
            <p className="text-xs text-center text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
              El pago con tarjeta local no está disponible para este producto. Usa transferencia o PayPal.
            </p>
          )}

          {/* BOTÓN 2: WHATSAPP */}
          <a
            href={aceptado ? linkWhatsApp : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!aceptado}
            onClick={(e) => !aceptado && e.preventDefault()}
            className={`w-full flex items-center justify-center px-4 py-3.5 border border-gray-200 text-base font-semibold rounded-lg text-gray-800 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all ${
              aceptado ? 'hover:bg-gray-50 hover:shadow' : 'cursor-not-allowed opacity-50'
            }`}
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

          {/* BOTÓN 3: PAYPAL. El monto lo fija el servidor a partir de cursoId. */}
          {paypalOk && (
            <div className="p-3 rounded-xl text-sm font-semibold bg-emerald-50 border border-emerald-200 text-emerald-800">
              ¡Pago confirmado! Te estamos llevando a tu aula.
            </div>
          )}
          {cursoId ? (
          <div
            className={`w-full z-0 relative transition-opacity ${aceptado ? '' : 'opacity-50 pointer-events-none select-none'}`}
            aria-disabled={!aceptado}
          >
            <PayPalScriptProvider 
              options={{ 
                clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test",
                currency: "USD",
                intent: "capture"
              }}
            >
              <PayPalButtons 
                style={{ layout: "vertical", shape: "rect", color: "blue", label: "pay" }}
                disabled={!cursoId || paypalOk || !aceptado}
                forceReRender={[aceptado]}
                onClick={(_, actions) => (aceptado ? actions.resolve() : actions.reject())}
                createOrder={async () => {
                  const response = await fetch('/api/paypal/create-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cursoId }),
                  });
                  const data = await response.json();
                  if (!response.ok || !data.orderID) {
                    throw new Error(data.error || 'No se pudo iniciar el pago');
                  }
                  pagoIdRef.current = data.pagoId || null;
                  return data.orderID as string;
                }}
                onApprove={async (data) => {
                  const response = await fetch('/api/paypal/capture', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderID: data.orderID, pagoId: pagoIdRef.current }),
                  });
                  const resultado = await response.json();
                  if (!response.ok) {
                    alert(resultado.error || 'No se pudo confirmar el pago.');
                    return;
                  }
                  setPaypalOk(true);
                  setTimeout(() => router.push('/mis-cursos'), 900);
                }}
                onError={(error) => {
                  console.error(error);
                  alert('PayPal no pudo completar el pago. Inténtalo de nuevo.');
                }}
              />
            </PayPalScriptProvider>
          </div>
          ) : (
            <p className="text-xs text-center text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
              PayPal solo está disponible al comprar un curso desde su página.
            </p>
          )}

        </div>
      </div>
    </div>
  );
}
