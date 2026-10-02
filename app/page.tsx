import Hero from './components/landing/Hero';
import CaminosDuales from './components/landing/CaminosDuales';
import Caracteristicas from './components/landing/Caracteristicas';
import PruebaSocial from './components/landing/PruebaSocial';
import CtaFinal from './components/landing/CtaFinal';
import { cargarEstadisticasLanding } from '@/lib/landing/estadisticas';

/** Las cifras de la prueba social se recalculan cada hora. */
export const revalidate = 3600;

export default async function HomePage() {
  const estadisticas = await cargarEstadisticasLanding();

  return (
    <div className="-mb-8 sm:-mb-12">
      <Hero />
      <CaminosDuales />
      <Caracteristicas />
      <PruebaSocial estadisticas={estadisticas} />
      <CtaFinal />
    </div>
  );
}
