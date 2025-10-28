import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { StoreDescription } from "@/components/StoreDescription";

const HeroSection = () => {
  const heroImage = "/hero-background.jpg";

  return (
    <section className="relative min-h-screen w-full flex items-center justify-center text-center text-white overflow-hidden">
      {/* Background Image */}
      <div className="absolute top-0 left-0 w-full h-full z-0">
        <img
          src={heroImage}
          alt="Mulher com roupa de academia bebendo água em um parque"
          className="w-full h-full object-cover"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-4 animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }}>
        <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter">
          Projetado para
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
            Performance
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-base md:text-lg text-white/80 font-light">
          Descubra roupas premium que unem estilo, resistência e performance para seu treino.
        </p>
        <Button asChild size="lg" className="mt-10 bg-white text-black border-2 border-white rounded-full px-10 py-7 text-base font-semibold transition-all duration-300 hover:scale-105 hover:bg-transparent hover:text-white">
          <Link to="/products">
            Explorar Coleção
          </Link>
        </Button>
      </div>
    </section>
  );
};


const Index = () => {
  return (
    <div>
      <HeroSection />
      <FeaturedProducts />
      <StoreDescription />
    </div>
  );
};

export default Index;