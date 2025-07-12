'use client';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    aria-hidden="true"
    fill="currentColor"
    viewBox="0 0 512 512"
    {...props}
  >
    <path d="M415.5 95.8c-28.5-28.5-66.2-44.1-106.1-44.1C201.3 51.7 122 131 122 239.1c0 35.2 9.8 68.3 27.5 96.5l-29.4 107.1 110-28.8c27.5 16.2 58.8 25.2 91.4 25.2 108.1 0 187.4-79.3 187.4-187.4 0-39.9-15.6-77.6-44.1-106.1zm-176.4 313c-29.3 0-56.8-8.8-80.4-24.5l-5.7-3.4-59.8 15.7 16-58.5-3.8-6c-17.2-27.2-26.4-58.6-26.4-91.8 0-91.3 74.4-165.7 165.7-165.7 44.8 0 86.8 17.5 117.2 47.9s47.9 72.4 47.9 117.2c0 91.3-74.4 165.7-165.7 165.7z" />
    <path d="M348.7 293.7c-4.4-2.2-26.2-12.9-30.2-14.4-4-1.5-7-2.2-9.9 2.2-2.9 4.4-11.4 14.4-14 17.3-2.6 2.9-5.2 3.3-9.6 1.1-4.4-2.2-18.6-6.9-35.4-21.8-13-11.6-21.8-25.9-24.3-30.3-2.6-4.4-.3-6.9 2-9.1 2.1-1.9 4.4-5.2 6.6-7.7 2.2-2.6 2.9-4.4 4.4-7.3 1.5-2.9.8-5.5-0.4-7.7-1.1-2.2-9.9-23.8-13.5-32.6-3.6-8.8-7.3-7.6-9.9-7.7-2.6-.1-5.5-.1-8.4-.1-2.9 0-7.7.8-11.7 4.4s-15.5 15.1-15.5 36.8c0 21.7 15.9 42.6 18.1 45.5 2.2 2.9 31 47.2 75.3 66.4 10.5 4.6 18.8 7.3 25.2 9.4 11.2 3.6 21.4 3.1 29.4 1.9 8.8-1.2 26.2-10.7 29.9-21.1 3.7-10.4 3.7-19.2 2.6-21.1-1.1-1.9-4.1-3.1-8.5-5.3z" />
  </svg>
);

export default function WhatsAppButton() {
  // **IMPORTANTE**: Cambia este número por tu número de WhatsApp real.
  // Debe incluir el código de país, sin el signo '+' ni espacios.
  const phoneNumber = '593992893010';
  
  // Opcional: Puedes añadir un mensaje predeterminado.
  const message = encodeURIComponent('Hola, me gustaría obtener más información sobre los cursos.');
  
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg hover:bg-[#128C7E] hover:scale-110 transition-all duration-300"
      aria-label="Contactar por WhatsApp"
    >
      <WhatsAppIcon className="w-8 h-8" />
    </a>
  );
}
