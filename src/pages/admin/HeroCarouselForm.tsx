import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { showError, showSuccess } from "@/utils/toast";
import { Loader2, Monitor, Smartphone } from "lucide-react";
import ImageUpload from "@/components/admin/ImageUpload";
import { Skeleton } from "@/components/ui/skeleton";

async function fetchCarouselSettings() {
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

export default function HeroCarouselForm() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["carouselSettings"],
    queryFn: fetchCarouselSettings,
  });

  const form = useForm({
    values: {
      desktop: settings?.hero_carousel_desktop || [],
      mobile: settings?.hero_carousel_mobile || [],
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: { desktop: string[]; mobile: string[] }) => {
      const settingsToUpsert = [
        { key: 'hero_carousel_desktop', value: JSON.stringify(values.desktop) },
        { key: 'hero_carousel_mobile', value: JSON.stringify(values.mobile) },
      ];

      const { error } = await supabase.from("settings").upsert(settingsToUpsert, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Carrossel atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["carouselSettings"] });
    },
    onError: (error: any) => showError(error.message),
  });

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => mutate(v))} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" /> Imagens Desktop
            </CardTitle>
            <CardDescription>Recomendado: 1920x1080px</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="desktop"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ImageUpload value={field.value} onChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" /> Imagens Mobile
            </CardTitle>
            <CardDescription>Recomendado: 1080x1920px</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="mobile"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ImageUpload value={field.value} onChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button type="submit" disabled={isPending} className="w-full md:w-auto">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Carrossel
        </Button>
      </form>
    </Form>
  );
}