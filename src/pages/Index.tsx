import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { StoreDescription } from "@/components/StoreDescription";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Skeleton } from "@/components/ui/skeleton";
import * as React from "react";

async function fetchCarouselImages() {
  const { data, error } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["hero_carousel_desktop", "hero_carousel_mobile"]);

  if (error) throw error;

  return data.reduce((acc, { key, value }) => {
    try {
      acc[key] = value ? JSON.parse(value) : [];
    } catch {
      acc[key] = [];
    }
    return acc;
  }, {} as Record<string, string[]>);
}

const HeroSection = () => {
  const isMobile = useIsMobile();
  const autoplay = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: false })
  );

  const { data: carouselData, isLoading } = useQuery({
    queryKey: ["heroCarousel"],
    queryFn: fetchCarouselImages,
  });

  const desktopDefaults = ["https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=2070&auto=format&fit=crop"];
  const mobileDefaults = ["/hero-background.jpg"];

  const images = isMobile 
    ? (carouselData?.hero_carousel_mobile?.length ? carouselData.hero_carousel_mobile : mobileDefaults)
    : (carouselData?.hero_carousel_desktop?.length ? carouselData.hero_carousel_desktop : desktopDefaults);

  if (isLoading) {
    return <Skeleton className="h-screen w-full" />;
  }

  return (
    <section className="relative min-h-screen w-full flex items-center justify-center text-center text-white overflow-hidden">
      {/* Background Carousel */}
      <div className="absolute top-0 left-0 w-full h-full z-0">
        <Carousel 
          plugins={[autoplay.current]}
          opts={{
            loop: true,
            align: "start",
          }}
          className="w-full h-full"
        >
          <CarouselContent className="h-screen ml-0">
            {images.map((src, index) => (
              <CarouselItem key={index} className="pl-0 h-screen w-full relative">
                <img
                  src={src}
                  alt={`Slide ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {/* Gradiente mais suave para melhorar a visibilidade da imagem */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-4 animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }}>
        <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter notranslate" translate="no">
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