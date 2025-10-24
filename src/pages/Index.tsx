import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <section className="relative h-screen w-full flex items-center justify-center text-center text-white">
      {/* Background Image */}
      <div className="absolute top-0 left-0 w-full h-full z-0">
        <img
          src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Woman practicing yoga"
          className="w-full h-full object-cover grayscale"
        />
        {/* Overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-black/70"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-4">
        <h1 className="text-5xl md:text-7xl font-extrabold uppercase tracking-tight">
          Projetado para
          <br />
          Desempenho
        </h1>
        <p className="mt-4 max-w-xl text-lg text-white/80">
          Descubra roupas premium que unem estilo, resistência e performance para seu treino.
        </p>
        <Button asChild size="lg" className="mt-8 bg-zinc-900 text-white hover:bg-zinc-800 rounded-md px-8 py-6 text-base font-semibold">
          <Link to="/products">
            Explorar Coleção
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default Index;