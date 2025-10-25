import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Policy } from "@/types/policy";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, PlusCircle, Edit } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import PolicyForm from "./PolicyForm";

async function fetchPolicies(): Promise<Policy[]> {
  const { data, error } = await supabase.from("policies").select("*").order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export default function AdminSettingsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | undefined>(undefined);

  const { data: policies, isLoading } = useQuery({
    queryKey: ["policies"],
    queryFn: fetchPolicies,
  });

  const handleEdit = (policy: Policy) => {
    setSelectedPolicy(policy);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedPolicy(undefined);
    setIsDialogOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Configurações do Site</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Política
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedPolicy ? "Editar" : "Adicionar"} Política</DialogTitle>
            </DialogHeader>
            <PolicyForm
              policy={selectedPolicy}
              onFinished={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {policies?.map((policy) => (
            <Card key={policy.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {policy.title}
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(policy)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="line-clamp-3">
                  {policy.content}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}