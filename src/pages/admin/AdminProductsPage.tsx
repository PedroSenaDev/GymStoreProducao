import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, MoreHorizontal, Search, Tags } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { showError, showSuccess } from "@/utils/toast";
import ProductForm from "./ProductForm";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Link } from "react-router-dom";

async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from("products").select("*, categories(name)").order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  // @ts-ignore
  return data;
}

export default function AdminProductsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const { mutate: deleteProduct } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Produto excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => showError(error.message),
  });

  const { mutate: toggleFeatured } = useMutation({
    mutationFn: async (product: Product) => {
      const featuredCount = products?.filter(p => p.is_featured).length ?? 0;

      if (!product.is_featured && featuredCount >= 3) {
        throw new Error("Você só pode ter 3 produtos em destaque. Desmarque um para adicionar um novo.");
      }

      const { error } = await supabase
        .from("products")
        .update({ is_featured: !product.is_featured })
        .eq("id", product.id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Status do produto atualizado!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => showError(error.message),
  });

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedProduct(undefined);
    setIsDialogOpen(true);
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold self-start md:self-center">Produtos</h1>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nome..."
              className="pl-10 w-full sm:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to="/admin/products/categories">
              <Tags className="mr-2 h-4 w-4" />
              Gerenciar Categorias
            </Link>
          </Button>
          <Button onClick={handleAddNew} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Produto
          </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProduct ? "Editar" : "Adicionar"} Produto</DialogTitle>
          </DialogHeader>
          <ProductForm
            product={selectedProduct}
            onFinished={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <>
          {/* Tabela para Desktop */}
          <div className="hidden md:block border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Imagem</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Destaque</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts?.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <img src={product.image_urls?.[0] || '/placeholder.svg'} alt={product.name} className="h-12 w-12 object-cover rounded-md" />
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    {/* @ts-ignore */}
                    <TableCell><Badge variant="outline">{product.categories?.name || 'N/A'}</Badge></TableCell>
                    <TableCell>{formatCurrency(product.price)}</TableCell>
                    <TableCell>{product.stock}</TableCell>
                    <TableCell>
                      <Switch
                        checked={product.is_featured}
                        onCheckedChange={() => toggleFeatured(product)}
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(product)}>Editar</DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()}>Excluir</DropdownMenuItem></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>Esta ação não pode ser desfeita. Isso excluirá permanentemente o produto.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteProduct(product.id)}>Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Cards para Mobile */}
          <div className="md:hidden space-y-4">
            {filteredProducts?.map((product) => (
              <Card key={product.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                  <div className="flex items-start gap-4">
                    <img src={product.image_urls?.[0] || '/placeholder.svg'} alt={product.name} className="h-16 w-16 object-cover rounded-md" />
                    <div>
                      <h3 className="font-semibold">{product.name}</h3>
                      {/* @ts-ignore */}
                      <Badge variant="outline" className="text-xs mt-1">{product.categories?.name || 'N/A'}</Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(product)}>Editar</DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()}>Excluir</DropdownMenuItem></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação não pode ser desfeita. Isso excluirá permanentemente o produto.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteProduct(product.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Preço</p>
                    <p className="font-medium">{formatCurrency(product.price)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Estoque</p>
                    <p className="font-medium">{product.stock}</p>
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between pt-4">
                  <span className="text-sm text-muted-foreground">Destaque</span>
                  <Switch
                    checked={product.is_featured}
                    onCheckedChange={() => toggleFeatured(product)}
                  />
                </CardFooter>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}