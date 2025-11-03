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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showError, showSuccess } from "@/utils/toast";
import { SizeChart } from "@/types/sizeChart";
import { Product } from "@/types/product";
import { Category } from "@/types/category";
import { Loader2, Search, X } from "lucide-react";
import SingleImageUpload from "@/components/admin/SingleImageUpload";
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
  const [isAddingByCategory, setIsAddingByCategory] = useState(false);

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
        else setLinkedProducts(data || []);
      };
      fetchLinkedProducts();
    }
  }, [sizeChart]);

  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase.from("categories").select("*").order('name');
      if (error) throw new Error(error.message);
      return data;
    },
  });

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
      const { data: chartData, error: chartError } = await supabase
        .from("size_charts")
        .upsert({ id: sizeChart?.id, ...values })
        .select()
        .single();
      if (chartError) throw chartError;

      const newChartId = chartData.id;

      if (sizeChart) {
        const { error: unlinkError } = await supabase
          .from("products")
          .update({ size_chart_id: null })
          .eq("size_chart_id", sizeChart.id);
        if (unlinkError) throw unlinkError;
      }

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

  const handleAddCategoryProducts = async (categoryId: string) => {
    if (!categoryId) return;
    setIsAddingByCategory(true);
    try {
      const { data: categoryProducts, error } = await supabase
        .from("products")
        .select("*")
        .eq("category_id", categoryId);
      if (error) throw error;

      const newProducts = categoryProducts.filter(p => !linkedProducts.some(lp => lp.id === p.id));
      setLinkedProducts(prev => [...prev, ...newProducts]);
      showSuccess(`${newProducts.length} produto(s) da categoria foram adicionados.`);
    } catch (error: any) {
      showError("Erro ao buscar produtos da categoria: " + error.message);
    } finally {
      setIsAddingByCategory(false);
    }
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
              <FormControl><SingleImageUpload value={field.value} onChange={field.onChange} folder="size_charts" /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          <FormLabel>Vincular a Produtos</FormLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div className="relative">
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
                    <div key={p.id} onClick={() => addProduct(p)} className="p-2 hover:bg-muted cursor-pointer text-sm">
                      {p.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Select onValueChange={handleAddCategoryProducts} disabled={isAddingByCategory || isLoadingCategories}>
              <SelectTrigger>
                <SelectValue placeholder="Ou adicione por categoria" />
                {isAddingByCategory && <Loader2 className="h-4 w-4 animate-spin" />}
              </SelectTrigger>
              <SelectContent>
                {categories?.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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