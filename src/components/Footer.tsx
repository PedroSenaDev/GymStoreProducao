import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Policy } from '@/types/policy';
import { Logo } from './Logo';
import { Separator } from './ui/separator';

async function fetchFooterPolicies(): Promise<Policy[]> {
  const { data, error } = await supabase
    .from('policies')
    .select('id, title')
    .in('display_area', ['footer', 'both'])
    .order('title');
  
  if (error) {
    console.error("Error fetching footer policies:", error);
    return [];
  }
  return data;
}

export const Footer = () => {
  const { data: policies } = useQuery({
    queryKey: ['footerPolicies'],
    queryFn: fetchFooterPolicies,
  });

  return (
    <footer className="bg-black text-gray-300 border-t border-gray-800">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="flex flex-col gap-4 items-center md:items-start">
            <Logo className="text-white" />
            <p className="text-sm text-center md:text-left">
              Roupas de performance que unem estilo, resistência e conforto para o seu treino.
            </p>
          </div>
          <div className="text-center md:text-left">
            <h3 className="font-semibold text-white mb-4 notranslate" translate="no">Navegação</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors notranslate" translate="no">Início</Link></li>
              <li><Link to="/products" className="hover:text-white transition-colors notranslate" translate="no">Produtos</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors notranslate" translate="no">Contato</Link></li>
            </ul>
          </div>
          <div className="text-center md:text-left">
            <h3 className="font-semibold text-white mb-4 notranslate" translate="no">Políticas</h3>
            {policies && policies.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {policies.map(policy => (
                  <li key={policy.id}>
                    <Link to={`/policy/${policy.id}`} className="hover:text-white transition-colors notranslate" translate="no">
                      {policy.title}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm">Nenhuma política disponível.</p>
            )}
          </div>
          <div className="text-center md:text-left">
            <h3 className="font-semibold text-white mb-4 notranslate" translate="no">Contato</h3>
            <ul className="space-y-2 text-sm notranslate" translate="no">
              <li>contato@gymstore.com</li>
              <li>(11) 99999-9999</li>
            </ul>
          </div>
        </div>
        <Separator className="my-8 bg-gray-800" />
        <div className="text-center text-sm notranslate" translate="no">
          © {new Date().getFullYear()} GYMSTORE. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
};