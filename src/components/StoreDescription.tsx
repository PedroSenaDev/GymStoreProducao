import { Dumbbell } from 'lucide-react';

export const StoreDescription = () => {
  return (
    <section className="container py-16 md:py-24">
      <div className="mx-auto max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
        <div className="flex justify-center md:justify-start">
            <Dumbbell className="h-20 w-20 md:h-24 md:w-24 text-primary" />
        </div>
        <div className="md:col-span-2 text-center md:text-left">
          <h2 className="text-3xl font-bold tracking-tight">Sobre Nossa Loja</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Na GYMSTORE, acreditamos que a roupa certa pode transformar seu treino. Nascemos da paixão pelo fitness e pela moda, com a missão de oferecer peças que combinam alta performance, conforto e estilo. Cada item da nossa coleção é cuidadosamente selecionado para garantir durabilidade e funcionalidade, permitindo que você se concentre no que realmente importa: superar seus limites.
          </p>
        </div>
      </div>
    </section>
  );
};