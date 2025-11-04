import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "@/lib/zod-pt";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showError, showSuccess } from "@/utils/toast";
import { Product } from "@/types/product";
import { Category } from "@/types/category";
import { Loader2 } from "lucide-react";
import ImageUpload from "@/components/admin/ImageUpload";
import ColorNamePickerInput from "@/components/admin/ColorNamePickerInput";

const formSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.coerce.number({ invalid_type_error: "O preço deve ser um número." }).min(0, { message: "O preço não pode ser negativo." }),
  stock: z.coerce.number({ invalid_type_error: "O estoque deve ser um número." }).int({ message: "O estoque deve ser um número inteiro." }).min(0, { message: "O estoque não pode ser negativo." }),
  category_id: z.string().min(1, { message: "Por favor, selecione uma categoria." }).uuid({ message: "Categoria inválida." }),
  image_urls: z.array(z.string().url({ message: "URL da imagem inválida." })).optional().default([]),
  sizes: z.string().optional(),
  colors: z.array(z.object({
    code: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Código de cor inválido."),
    name: z.string().min(1, "O nome da cor é obrigatório."),
  })).optional().default([]),
  // Novos campos para Melhor Envio
  weight_kg: z.coerce.number({ invalid_type_error: "O peso deve ser um número." }).min(0.01, { message: "O peso mínimo é 0.01 kg." }),
  length_cm: z.coerce.number({ invalid_type_error: "O comprimento deve ser um número." }).min(1, { message: "O comprimento mínimo é 1 cm." }),
  height_cm: z.coerce.number({ invalid_type_error: "A altura deve ser um número." }).min(1, { message: "A altura mínima é 1 cm." }),
  width_cm: z.coerce.number({ invalid_type_error: "A largura deve ser um número." }).min(1, { message: "A largura mínima é 1 cm." }),
});

interface ProductFormProps {
  product?: Product;
  onFinished: () => void;
}

export default function ProductForm({ product, onFinished }: ProductFormProps) {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      price: product?.price || 0,
      stock: product?.stock || 0,
      category_id: product?.category_id || "",
      image_urls: product?.image_urls || [],
      sizes: product?.sizes?.join(", ") || "",
      colors: product?.colors || [],
      // Valores padrão para novos campos
      weight_kg: product?.weight_kg || 0.1,
      length_cm: product?.length_cm || 10,
      height_cm: product?.height_cm || 10,
      width_cm: product?.width_cm || 10,
    },
  });

  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase.from("categories").select("*");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const processedValues = {
        ...values,
        sizes: values.sizes?.split(",").map(s => s.trim()).filter(Boolean) || [],
      };

      const { data, error } = await (product?.id
        ? supabase.from("products").update(processedValues).eq("id", product.id)
        : supabase.from("products").insert([processedValues]));

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess(`Produto ${product?.id ? 'atualizado' : 'criado'} com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onFinished();
    },
    onError: (error) => {
      showError(error.message);
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutate(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Produto</FormLabel>
              <FormControl><Input placeholder="Ex: Camiseta Dry Fit" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl><Textarea placeholder="Descreva o produto" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Preço</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Estoque</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingCategories}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {categories?.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
        />
        <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-semibold">Dimensões e Peso (Melhor Envio)</h3>
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="weight_kg"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Peso (kg)</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="length_cm"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Comprimento (cm)</FormLabel>
                        <FormControl><Input type="number" step="1" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="height_cm"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Altura (cm)</FormLabel>
                        <FormControl><Input type="number" step="1" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="width_cm"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Largura (cm)</FormLabel>
                        <FormControl><Input type="number" step="1" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>
        <FormField
            control={form.control}
            name="sizes"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Tamanhos</FormLabel>
                <FormControl><Input placeholder="P, M, G (separados por vírgula)" {...field} /></FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="colors"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Cores</FormLabel>
                <FormControl>
                    <ColorNamePickerInput value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="image_urls"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Imagens</FormLabel>
                    <FormControl>
                        <ImageUpload value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Produto
        </Button>
      </form>
    </Form>
  );
}