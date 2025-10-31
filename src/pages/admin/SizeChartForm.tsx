import { useEffect, useState } from "react";
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
import { showError, showSuccess } from "@/utils/toast";
import { SizeChart } from "@/types/sizeChart";
import { Product } from "@/types/product";
import { Loader2, Search, X } from "lucide-react";
import SingleImageUpload from "@/components/admin/SingleImageUpload";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  title: z.string().min(3, "O título é obrigatório."),
  image_url: z.string().url("É necessário enviar uma imagem.").min(1, "É necessário enviar uma imagem."),
});

interface SizeChartFormProps {
  sizeChart?: SizeChart;
  onFinished: () => void;
}

export default function SizeChartForm({ sizeChart, onFinished }: SizeChartFormProps) {
  const queryClient = useQueryClient();
  const [productSearch, setProductSearch] = useState("");
  const [linkedProducts, setLinkedProducts] = useState<Product[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: sizeChart?.title || "",
      image_url: sizeChart?.image_url || "",
    },
  });

  // Fetch products linked to this size chart on initial load
  useEffect(() => {
    if (sizeChart) {
      const fetchLinkedProducts = async () => {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("size_chart_id", sizeChart.id);
        if (error) console.error(error);
        else setLinkedProducts(data);
      };
      fetchLinkedProducts();
    }
  }, [sizeChart]);

  const { data: searchedProducts } = useQuery({
    queryKey: ["productSearch", productSearch],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .ilike("name", `%${productSearch}%`)
        .limit(5);
      return data;
    },
    enabled: productSearch.length > 2,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      // 1. Upsert the size chart
      const { data: chartData, error: chartError } = await supabase
        .from("size_charts")
        .upsert({ id: sizeChart?.id, ...values })
        .select()
        .single();
      if (chartError) throw chartError;

      const newChartId = chartData.id;

      // 2. Unlink all products currently linked to this chart
      if (sizeChart) {
        const { error: unlinkError } = await supabase
          .from("products")
          .update({ size_chart_id: null })
          .eq("size_chart_id", sizeChart.id);
        if (unlinkError) throw unlinkError;
      }

      // 3. Link the selected products to the new chart
      if (linkedProducts.length > 0) {
        const productIds = linkedProducts.map(p => p.id);
        const { error: linkError } = await supabase
          .from("products")
          .update({ size_chart_id: newChartId })
          .in("id", productIds);
        if (linkError) throw linkError;
      }
    },
    onSuccess: () => {
      showSuccess("Tabela de medidas salva com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["sizeCharts"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onFinished();
    },
    onError: (error: any) => showError(error.message),
  });

  const addProduct = (product: Product) => {
    if (!linkedProducts.some(p => p.id === product.id)) {
      setLinkedProducts(prev => [...prev, product]);
    }
    setProductSearch("");
  };

  const removeProduct = (productId: string) => {
    setLinkedProducts(prev => prev.filter(p => p.id !== productId));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(v => mutate(v))} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título da Tabela</FormLabel>
              <FormControl><Input placeholder="Ex: Tabela de Medidas - Camisetas" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="image_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Imagem da Tabela</FormLabel>
              <FormControl><SingleImageUpload value={field.value} onChange={field.onChange} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          <FormLabel>Vincular a Produtos</FormLabel>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto por nome..."
              className="pl-9"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
            {searchedProducts && productSearch && (
              <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg">
                {searchedProducts.map(p => (
                  <div key={p.id} onClick={() => addProduct(p)} className="p-2 hover:bg-muted cursor-pointer">
                    {p.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {linkedProducts.map(p => (
              <Badge key={p.id} variant="secondary" className="flex items-center gap-1">
                {p.name}
                <button type="button" onClick={() => removeProduct(p.id)} className="rounded-full hover:bg-muted-foreground/20">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Tabela de Medidas
        </Button>
      </form>
    </Form>
  );
}