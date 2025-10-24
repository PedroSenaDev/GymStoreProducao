export default function ProductsPage() {
  return (
    <div className="container py-8 md:py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Nossos Produtos</h1>
        <p className="mt-4 text-lg text-muted-foreground">Confira nossa coleção premium de roupas de performance.</p>
      </div>
      {/* Product listing will go here */}
      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {/* Placeholder for products */}
        <div className="text-center">
          <div className="h-64 w-full rounded-lg bg-muted"></div>
          <h3 className="mt-4 text-lg font-semibold">Produto Exemplo</h3>
          <p className="mt-1 text-muted-foreground">R$ 199,90</p>
        </div>
        <div className="text-center">
          <div className="h-64 w-full rounded-lg bg-muted"></div>
          <h3 className="mt-4 text-lg font-semibold">Produto Exemplo</h3>
          <p className="mt-1 text-muted-foreground">R$ 199,90</p>
        </div>
        <div className="text-center">
          <div className="h-64 w-full rounded-lg bg-muted"></div>
          <h3 className="mt-4 text-lg font-semibold">Produto Exemplo</h3>
          <p className="mt-1 text-muted-foreground">R$ 199,90</p>
        </div>
      </div>
    </div>
  );
}