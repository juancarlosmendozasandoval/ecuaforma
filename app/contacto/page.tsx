import { Phone, Mail, MapPin } from 'lucide-react';

export default function ContactoPage() {
  return (
    <div className="main-container">
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-10">Contáctanos</h1>
      <p className="text-center text-lg text-text-secondary mb-12 max-w-2xl mx-auto">
        ¿Tienes preguntas? Estamos aquí para ayudarte en tu camino hacia el éxito.
      </p>
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold text-primary mb-6">Información de Contacto</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <Phone className="w-6 h-6 text-primary mr-4" />
                <span className="text-text-primary">+593 99 289 3010</span>
              </div>
              <div className="flex items-center">
                <Mail className="w-6 h-6 text-primary mr-4" />
                <span className="text-text-primary">contacto.ecuaforma@gmail.com</span>
              </div>
              <div className="flex items-center">
                <MapPin className="w-6 h-6 text-primary mr-4" />
                <span className="text-text-primary">Guayaquil, Ecuador</span>
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-primary mb-6">Envíanos un mensaje</h2>
            <form className="space-y-4">
              <input type="text" placeholder="Tu Nombre" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" />
              <input type="email" placeholder="Tu Correo Electrónico" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" />
              <textarea placeholder="Tu Mensaje" rows={4} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"></textarea>
              <button type="submit" className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-secondary transition-colors">
                Enviar Mensaje
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}