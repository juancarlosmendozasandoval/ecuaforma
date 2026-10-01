'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface CertificateProps {
  nombreAlumno: string;
  nombreCurso: string;
  institucion: string;
  /** Fecha ya formateada: la del último progreso, o la de hoy si no hay registro. */
  fechaCompletado: string;
}

/** "Matemáticas" y "Juan Pérez" pasan a Matematicas y Juan_Perez. */
function parteArchivo(valor: string) {
  const limpio = (valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return limpio || 'Estudiante';
}

export default function CertificateGenerator({ nombreAlumno, nombreCurso, institucion, fechaCompletado }: CertificateProps) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const alumno = (nombreAlumno || '').trim() || 'Estudiante';
  const [nombreImpreso, setNombreImpreso] = useState(alumno);

  useEffect(() => {
    setNombreImpreso(alumno);
  }, [alumno]);

  const fechaDiploma = fechaCompletado || new Date().toLocaleDateString('es-EC', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleDownloadPdf = async () => {
    // 1. Preguntamos al alumno cómo quiere que aparezca su nombre
    const nombreConfirmado = window.prompt(
      "Por favor, ingresa tus nombres y apellidos completos para el certificado:", 
      nombreImpreso
    );

    // Si el usuario cancela o lo deja vacío, no hacemos nada
    if (!nombreConfirmado || nombreConfirmado.trim() === '') {
      return; 
    }

    // 2. Actualizamos el estado con el nombre elegido
    setNombreImpreso(nombreConfirmado);
    setIsGenerating(true);

    // 3. Esperamos 300ms para que React pinte el nuevo nombre en el div oculto antes de tomar la foto
    setTimeout(async () => {
      const element = certificateRef.current;
      if (!element) {
        setIsGenerating(false);
        return;
      }

      try {
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
        pdf.save(`Certificado_${parteArchivo(nombreCurso)}_${parteArchivo(nombreConfirmado)}.pdf`);
      } catch (error) {
        console.error("Error al generar el certificado:", error);
        alert("Hubo un problema al generar tu certificado. Inténtalo de nuevo.");
      } finally {
        setIsGenerating(false);
      }
    }, 300);
  };

  return (
    <>
      <button
        onClick={handleDownloadPdf}
        disabled={isGenerating}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-emerald-700 disabled:transform-none disabled:bg-emerald-400"
      >
        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {isGenerating ? 'Generando...' : 'Descargar Certificado'}
      </button>

      {/* Fuera de la tarjeta: fixed no queda recortado por overflow y html2canvas puede leerlo. */}
      <div className="pointer-events-none fixed left-[-12000px] top-0" aria-hidden="true">
        <div 
          ref={certificateRef} 
          className="w-[1123px] h-[794px] bg-white relative overflow-hidden flex flex-col items-center justify-center font-sans"
        >
          {/* Marcos Decorativos */}
          <div className="absolute inset-4 border-[12px] border-slate-900 pointer-events-none"></div>
          <div className="absolute inset-8 border-[2px] border-slate-300 pointer-events-none"></div>

          <div className="mb-4 mt-2 flex items-center gap-4">
            <svg className="h-16 w-16" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M50 10 L 90 35 L 90 75 L 50 95 L 10 75 L 10 35 Z" fill="#2d3748" />
              <path d="M30 40 L 50 28 L 70 40" stroke="#FFD700" strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M30 58 L 50 46 L 70 58" stroke="#3b82f6" strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M30 76 L 50 64 L 70 76" stroke="#ef4444" strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-3xl font-black tracking-[0.25em] text-slate-900">ECUAFORMA</span>
          </div>

          <h1 className="text-5xl font-black text-slate-900 tracking-widest uppercase mb-4">
            Certificado de Finalización
          </h1>
          <p className="text-xl text-slate-500 tracking-widest uppercase mb-8">
            Otorgado por la Academia Digital Ecuaforma
          </p>

          <p className="text-2xl text-slate-600 mb-2">Se certifica formalmente que</p>
          
          <h2 className="text-6xl font-serif text-blue-800 italic capitalize mb-10">
            {nombreImpreso}
          </h2>

          <p className="text-2xl text-slate-600 mb-4 max-w-3xl text-center leading-relaxed">
            Ha completado satisfactoriamente todos los módulos y evaluaciones del programa académico:
          </p>
          <h3 className="text-4xl font-bold text-slate-800 mb-12 max-w-4xl text-center px-8">
            {nombreCurso} - Aspirantes a la {institucion}
          </h3>

          {/* 🌟 FIRMAS Y FECHA SIN LÍNEAS Y CON MÁRGENES REDUCIDOS 🌟 */}
          <div className="flex flex-row justify-between items-end w-full max-w-5xl px-12 mb-6">
            
            {/* DIRECTOR */}
            <div className="flex flex-col items-center w-72">
              <span className="text-slate-700 italic font-serif text-4xl mb-3">Juan Mendoza</span>
              <p className="text-xl font-bold text-slate-900">Ing. Juan Mendoza</p>
              <p className="text-sm text-slate-500 uppercase tracking-widest mt-1">Director Académico</p>
            </div>
            
            {/* FECHA */}
            <div className="flex flex-col items-center w-64">
               <p className="text-2xl font-bold text-slate-800 mb-3">{fechaDiploma}</p>
               <p className="text-sm text-slate-500 uppercase tracking-widest">Fecha de Emisión</p>
            </div>

            {/* COORDINADOR */}
            <div className="flex flex-col items-center w-72">
              <span className="text-slate-700 italic font-serif text-4xl mb-3">Sargento García</span>
              <p className="text-xl font-bold text-slate-900">Entrenamiento Puma</p>
              <p className="text-sm text-slate-500 uppercase tracking-widest mt-1">Coordinador Físico</p>
            </div>

          </div>
          
          <div className="absolute bottom-10 text-slate-300 font-black text-xl tracking-[1em] opacity-50 select-none">
            ECUAFORMA
          </div>
        </div>
      </div>
    </>
  );
}