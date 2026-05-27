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
      // Configuraciones óptimas para evitar recortes o fallos en la foto
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
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
      {/* BOTÓN VISIBLE */}
      <button
        onClick={handleDownloadPdf}
        disabled={isGenerating}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-md transform hover:-translate-y-0.5 disabled:bg-emerald-400 disabled:transform-none"
      >
        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {isGenerating ? 'Generando...' : 'Descargar Certificado'}
      </button>

      {/* PLANTILLA DEL CERTIFICADO (Oculta) */}
      <div className="absolute -left-[9999px] top-0">
        <div 
          ref={certificateRef} 
          className="w-[1123px] h-[794px] bg-white relative overflow-hidden flex flex-col items-center justify-center font-sans"
        >
          {/* Marcos Decorativos Clásicos */}
          <div className="absolute inset-4 border-[12px] border-slate-900 pointer-events-none"></div>
          <div className="absolute inset-8 border-[2px] border-slate-300 pointer-events-none"></div>

          {/* LOGO DE ECUAFORMA */}
          <div className="mb-6 mt-2">
            <img 
              src="/logo.png" 
              alt="Ecuaforma Logo" 
              className="h-20 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if(parent) parent.innerHTML = '<span class="text-4xl font-black tracking-widest text-slate-900">ECUAFORMA</span>';
              }}
            />
          </div>

          {/* Cabecera */}
          <h1 className="text-5xl font-black text-slate-900 tracking-widest uppercase mb-4">
            Certificado de Finalización
          </h1>
          <p className="text-xl text-slate-500 tracking-widest uppercase mb-10">
            Otorgado por la Academia Digital Ecuaforma
          </p>

          {/* Cuerpo del Certificado */}
          <p className="text-2xl text-slate-600 mb-2">Se certifica formalmente que</p>
          <h2 className="text-6xl font-serif text-blue-800 italic capitalize mb-4">
            {nombreLimpio}
          </h2>
          <div className="w-2/3 border-b border-slate-200 mb-8"></div>

          <p className="text-2xl text-slate-600 mb-4 max-w-3xl text-center leading-relaxed">
            Ha completado satisfactoriamente todos los módulos y evaluaciones del programa académico:
          </p>
          <h3 className="text-4xl font-bold text-slate-800 mb-16 max-w-4xl text-center px-8">
            {nombreCurso} - Aspirantes a la {institucion}
          </h3>

          {/* 🌟 FIRMAS Y FECHA: DISEÑO SÓLIDO A PRUEBA DE ERRORES 🌟 */}
          <div className="flex flex-row justify-between items-end w-full max-w-5xl px-12 mt-4">
            
            {/* FIRMA DE JUAN MENDOZA */}
            <div className="flex flex-col items-center w-72">
              <div className="h-16 flex items-end justify-center pb-2">
                <span className="text-slate-700 italic font-serif text-4xl leading-none">Juan Mendoza</span>
              </div>
              <div className="w-full border-t-2 border-slate-800"></div>
              <p className="text-xl font-bold text-slate-900 mt-3">Ing. Juan Mendoza</p>
              <p className="text-sm text-slate-500 uppercase tracking-widest mt-1">Director Académico</p>
            </div>
            
            {/* FECHA CENTRAL */}
            <div className="flex flex-col items-center w-64 pb-2">
               <p className="text-2xl font-bold text-slate-800 mb-3">{fechaHoy}</p>
               <div className="w-full border-t border-slate-300"></div>
               <p className="text-sm text-slate-500 uppercase tracking-widest mt-3">Fecha de Emisión</p>
            </div>

            {/* FIRMA SARGENTO GARCÍA */}
            <div className="flex flex-col items-center w-72">
              <div className="h-16 flex items-end justify-center pb-2">
                <span className="text-slate-700 italic font-serif text-4xl leading-none">Sargento García</span>
              </div>
              <div className="w-full border-t-2 border-slate-800"></div>
              <p className="text-xl font-bold text-slate-900 mt-3">Entrenamiento Puma</p>
              <p className="text-sm text-slate-500 uppercase tracking-widest mt-1">Coordinador Físico</p>
            </div>

          </div>
          
          {/* Marca de agua pequeña e inofensiva */}
          <div className="absolute bottom-6 text-slate-300 font-black text-xl tracking-[1em] opacity-50 select-none">
            ECUAFORMA
          </div>
        </div>
      </div>
    </>
  );
}