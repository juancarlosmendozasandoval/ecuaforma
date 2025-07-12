export default function CursosPage() {
  const cursos = [
    { title: 'Curso FAE', description: 'Preparación completa para la Fuerza Aérea.' },
    { title: 'Curso Armada', description: 'Asegura tu ingreso a la Armada del Ecuador.' },
    { title: 'Curso Ejército', description: 'Conviértete en oficial o tropa del Ejército.' },
    { title: 'Curso Policía', description: 'Prepárate para ser parte de la Policía Nacional.' },
  ];

  return (
    <div className="main-container">
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-10">Nuestros Cursos</h1>
      <p className="text-center text-lg text-text-secondary mb-12 max-w-2xl mx-auto">
        Ofrecemos preparación especializada para cada institución. Por el momento, esta sección está en construcción. ¡Vuelve pronto!
      </p>
      <div className="grid md:grid-cols-2 gap-8">
        {cursos.map(curso => (
          <div key={curso.title} className="bg-white p-6 rounded-lg shadow-md">
             <h3 className="text-xl font-bold text-primary">{curso.title}</h3>
             <p className="text-text-secondary mt-1">{curso.description}</p>
             <button disabled className="mt-4 bg-gray-300 text-gray-500 font-bold py-2 px-4 rounded cursor-not-allowed">
                Próximamente
             </button>
          </div>
        ))}
      </div>
    </div>
  );
}