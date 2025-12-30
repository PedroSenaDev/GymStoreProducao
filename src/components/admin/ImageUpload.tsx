import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, X } from "lucide-react";
import { showError } from "@/utils/toast";

interface ImageUploadProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export default function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("Você precisa selecionar uma imagem para fazer o upload.");
      }

      const files = Array.from(event.target.files);
      
      // Validação extra no lado do cliente
      const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
      if (invalidFiles.length > 0) {
        throw new Error("Apenas arquivos de imagem são permitidos.");
      }

      const uploadPromises = files.map(async (file) => {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `products/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from("products")
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("products")
          .getPublicUrl(filePath);
        
        return publicUrl;
      });

      const newImageUrls = await Promise.all(uploadPromises);
      onChange([...value, ...newImageUrls]);

    } catch (error: any) {
      showError(error.message);
    } finally {
      setIsUploading(false);
      // Limpa o input para permitir selecionar o mesmo arquivo novamente se necessário
      event.target.value = "";
    }
  };

  const handleRemove = (urlToRemove: string) => {
    onChange(value.filter((url) => url !== urlToRemove));
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 overflow-x-auto pb-2">
        {value.map((url) => (
          <div key={url} className="relative w-32 h-32 flex-shrink-0">
            <img
              src={url}
              alt="Imagem do produto"
              className="w-full h-full object-cover rounded-md"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6"
              onClick={() => handleRemove(url)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="relative">
        <Input
            id="image-upload"
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            disabled={isUploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <Button type="button" variant="outline" className="w-full" disabled={isUploading}>
            {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Upload className="mr-2 h-4 w-4" />
            )}
            {isUploading ? "Enviando..." : "Enviar Imagens"}
        </Button>
      </div>
    </div>
  );
}