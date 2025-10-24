import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ContactPage() {
  return (
    <div className="container py-8 md:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Entre em Contato</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Tem alguma dúvida ou sugestão? Adoraríamos ouvir você.
        </p>
      </div>
      <div className="mx-auto mt-12 max-w-xl">
        <form className="space-y-6">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input id="name" type="text" placeholder="Seu nome" className="mt-2" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="seu@email.com" className="mt-2" />
          </div>
          <div>
            <Label htmlFor="message">Mensagem</Label>
            <Textarea id="message" placeholder="Sua mensagem..." className="mt-2" rows={5} />
          </div>
          <Button type="submit" className="w-full">Enviar Mensagem</Button>
        </form>
      </div>
    </div>
  );
}