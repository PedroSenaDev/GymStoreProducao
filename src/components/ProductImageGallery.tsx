import * as React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ProductImageGalleryProps {
  images: string[];
}

export function ProductImageGallery({ images }: ProductImageGalleryProps) {
  const imageList = images.length > 0 ? images : ['/placeholder.svg'];
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (!api) {
      return;
    }

    setCurrent(api.selectedScrollSnap());

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    api.on("select", onSelect);

    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const handleThumbnailClick = (index: number) => {
    api?.scrollTo(index);
  };

  return (
    <div className="flex flex-col gap-4">
      <Carousel setApi={setApi} className="w-full">
        <CarouselContent>
          {imageList.map((src, index) => (
            <CarouselItem key={index}>
              <Card className="overflow-hidden rounded-lg">
                <CardContent className="flex aspect-square items-center justify-center p-0 bg-background">
                  <img 
                    src={src} 
                    alt={`Imagem do produto ${index + 1}`} 
                    className="h-full w-full object-contain" 
                  />
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-4" />
        <CarouselNext className="right-4" />
      </Carousel>

      {imageList.length > 1 && (
        <div className="grid grid-cols-5 gap-4">
          {imageList.map((src, index) => (
            <button
              key={index}
              onClick={() => handleThumbnailClick(index)}
              className={cn(
                "overflow-hidden rounded-lg aspect-square focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                index === current ? "ring-2 ring-primary ring-offset-2" : "ring-0"
              )}
            >
              <img
                src={src}
                alt={`Thumbnail ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}