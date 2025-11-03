import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, X } from "lucide-react";
import { showError } from "@/utils/toast";

interface SingleImageUploadProps {
  value: string | null;
  onChange: (value: string | null) => void;
  folder?: string;
}

export default function SingleImageUpload({ value, onChange, folder = 'public' }: SingleImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("Você precisa selecionar uma imagem para fazer o upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from("products") // Using the same bucket as product images
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("products")
        .getPublicUrl(filePath);
      
      onChange(publicUrl);

    } catch (error: any) {
      showError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onChange(null);
    // Note: This doesn't remove the file from Supabase Storage to keep it simple.
  };

  return (
    <div>
      {value ? (
        <div className="relative w-full h-48 border rounded-md">
          <img
            src={value}
            alt="Pré-visualização da imagem"
            className="w-full h-full object-contain rounded-md"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Input
              id="image-upload"
              type="file"
              accept="image/*"
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
              {isUploading ? "Enviando..." : "Enviar Imagem"}
          </Button>
        </div>
      )}
    </div>
  );
}