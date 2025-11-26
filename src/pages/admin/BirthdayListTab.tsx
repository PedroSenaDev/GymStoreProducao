import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Cake } from "lucide-react";
import { format } from "date-fns";

// Simplificando o tipo, já que o email vem direto do profile
type BirthdayProfile = {
    full_name: string | null;
    phone: string | null;
    birth_date: string | null;
    email: string | null;
};

async function fetchBirthdays(): Promise<BirthdayProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, phone, birth_date, email")
    .not("birth_date", "is", null)
    .order("full_name");

  if (error) throw new Error(error.message);
  return data as BirthdayProfile[];
}

const months = [
  { value: "1", label: "Janeiro" }, { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" }, { value: "4", label: "Abril" },
  { value: "5", label: "Maio" }, { value: "6", label: "Junho" },
  { value: "7", label: "Julho" }, { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" }, { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" }, { value: "12", label: "Dezembro" },
];

export default function BirthdayListTab() {
  const [selectedMonth, setSelectedMonth] = useState("all");

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["birthdays"],
    queryFn: fetchBirthdays,
  });

  const filteredProfiles = useMemo(() => {
    if (!profiles) return [];
    if (selectedMonth === "all") return profiles;
    return profiles.filter(p => {
      if (!p.birth_date) return false;
      // Adiciona T00:00:00 para evitar problemas de fuso horário
      const birthMonth = new Date(`${p.birth_date}T00:00:00`).getMonth() + 1;
      return birthMonth === parseInt(selectedMonth, 10);
    });
  }, [profiles, selectedMonth]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Lista de Aniversariantes</CardTitle>
            <CardDescription>Filtre por mês para ver os clientes que fazem aniversário.</CardDescription>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Meses</SelectItem>
              {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : filteredProfiles.length > 0 ? (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Data de Nascimento</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map((profile, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{profile.full_name}</TableCell>
                    <TableCell>
                      {profile.birth_date ? format(new Date(`${profile.birth_date}T00:00:00`), 'dd/MM/yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell>{profile.email}</TableCell>
                    <TableCell>{profile.phone || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <Cake className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Nenhum aniversariante encontrado</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Nenhum cliente com data de nascimento cadastrada foi encontrado para este filtro.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}