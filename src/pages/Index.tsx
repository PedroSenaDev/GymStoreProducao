import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <section className="relative h-screen w-full flex items-center justify-center text-center text-white overflow-hidden">
      {/* Background Image */}
      <div className="absolute top-0 left-0 w-full h-full z-0">
        <img
          src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Woman practicing yoga"
          className="w-full h-full object-cover"
        />
        {/* Gradient Overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black via-black/60 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-4 animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }}>
        <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter">
          Projetado para
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
            Performance
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-white/80 font-light">
          Descubra roupas premium que unem estilo, resistência e performance para seu treino.
        </p>
        <Button asChild size="lg" className="mt-10 bg-white text-black hover:bg-white/90 rounded-full px-10 py-7 text-base font-semibold transition-transform hover:scale-105">
          <Link to="/products">
            Explorar Coleção
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default Index;