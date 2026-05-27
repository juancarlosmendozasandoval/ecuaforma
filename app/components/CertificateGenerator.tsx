'use client';

import { useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface CertificateProps {
  nombreAlumno: string;
  nombreCurso: string;
  institucion: string;
}

export default function CertificateGenerator({ nombreAlumno, nombreCurso, institucion }: CertificateProps) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Formatear el correo para que parezca un nombre
  const formatearNombre = (email: string) => {
    const prefijo = email.split('@')[0];
    return prefijo.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const nombreLimpio = formatearNombre(nombreAlumno);
  const fechaHoy = new Date().toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });

  const handleDownloadPdf = async () => {
    const element = certificateRef.current;
    if (!element) return;

    setIsGenerating(true);

    try {
      // Tomamos la "foto" del diseño HTML
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Certificado_Ecuaforma_${institucion}.pdf`);
    } catch (error) {
      console.error("Error al generar el certificado:", error);
      alert("Hubo un problema al generar tu certificado. Inténtalo de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* 🌟 BOTÓN VISIBLE EN LA INTERFAZ */}
      <button
        onClick={handleDownloadPdf}
        disabled={isGenerating}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-md transform hover:-translate-y-0.5 disabled:bg-emerald-400 disabled:transform-none"
      >
        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {isGenerating ? 'Generando...' : 'Descargar Certificado'}
      </button>

      {/* 🌟 PLANTILLA DEL CERTIFICADO (Oculta) */}
      <div className="absolute -left-[9999px] top-0">
        <div 
          ref={certificateRef} 
          className="w-[1123px] h-[794px] bg-white relative overflow-hidden flex flex-col items-center justify-center font-sans"
        >
          {/* Marco Decorativo */}
          <div className="absolute inset-4 border-[12px] border-slate-900"></div>
          <div className="absolute inset-8 border-[2px] border-slate-300"></div>

          {/* 🌟 LOGO DE ECUAFORMA */}
          <div className="mb-8">
            <img 
              src="/logo.png" 
              alt="Ecuaforma Logo" 
              className="h-24 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if(parent) parent.innerHTML = '<span class="text-4xl font-black tracking-widest text-slate-900">ECUAFORMA</span>';
              }}
            />
          </div>

          {/* Cabecera */}
          <h1 className="text-5xl font-black text-slate-900 tracking-widest uppercase mb-2">
            Certificado de Finalización
          </h1>
          <p className="text-xl text-slate-500 tracking-widest uppercase mb-12">
            Otorgado por la Academia Digital Ecuaforma
          </p>

          {/* Cuerpo */}
          <p className="text-2xl text-slate-600 mb-4">Se certifica que</p>
          <h2 className="text-6xl font-bold text-blue-700 mb-6 italic capitalize">
            {nombreLimpio}
          </h2>
          <p className="text-2xl text-slate-600 mb-2 max-w-3xl text-center leading-relaxed">
            Ha completado satisfactoriamente todos los módulos y evaluaciones del programa académico:
          </p>
          <h3 className="text-4xl font-bold text-slate-800 mb-16 max-w-4xl text-center">
            {nombreCurso} - Aspirantes a la {institucion}
          </h3>

          {/* Firmas y Fecha */}
          <div className="flex w-full max-w-4xl justify-between items-end mt-4 px-12">
            
            {/* 🌟 FIRMA DE JUAN MENDOZA (Solo texto elegante) */}
            <div className="flex flex-col items-center relative">
              <span className="text-slate-700 italic font-serif text-4xl absolute bottom-12">Juan Mendoza</span>
              <div className="w-64 border-b-2 border-slate-800 mb-2"></div>
              <p className="text-lg font-bold text-slate-800">Ing. Juan Mendoza</p>
              <p className="text-sm text-slate-500 uppercase tracking-wider">Director Académico</p>
            </div>
            
            <div className="flex flex-col items-center">
               <p className="text-xl font-bold text-slate-800 mb-1">{fechaHoy}</p>
               <p className="text-sm text-slate-500 uppercase tracking-wider border-t border-slate-300 pt-1">Fecha de Emisión</p>
            </div>

            {/* FIRMA SARGENTO GARCÍA */}
            <div className="flex flex-col items-center relative">
              <span className="text-slate-400 italic font-serif text-3xl absolute bottom-12">Sargento García</span>
              <div className="w-64 border-b-2 border-slate-800 mb-2"></div>
              <p className="text-lg font-bold text-slate-800">Entrenamiento Puma</p>
              <p className="text-sm text-slate-500 uppercase tracking-wider">Coordinador Físico</p>
            </div>
          </div>
          
          {/* Marca de agua */}
          <div className="absolute bottom-12 text-slate-300 font-black text-2xl tracking-[1em] opacity-30 select-none pointer-events-none">
            ECUAFORMA
          </div>
        </div>
      </div>
    </>
  );
}