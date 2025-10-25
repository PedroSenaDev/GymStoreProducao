import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";

interface ProductImageGalleryProps {
  images: string[];
}

export function ProductImageGallery({ images }: ProductImageGalleryProps) {
  const imageList = images.length > 0 ? images : ['/placeholder.svg'];

  return (
    <Carousel className="w-full">
      <CarouselContent>
        {imageList.map((src, index) => (
          <CarouselItem key={index}>
            <Card className="overflow-hidden rounded-lg">
              <CardContent className="flex aspect-square items-center justify-center p-0">
                <img src={src} alt={`Imagem do produto ${index + 1}`} className="h-full w-full object-cover" />
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-4" />
      <CarouselNext className="right-4" />
    </Carousel>
  );
}