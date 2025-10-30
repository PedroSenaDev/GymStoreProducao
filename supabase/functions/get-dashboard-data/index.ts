import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { subDays, format, eachDayOfInterval, startOfDay, endOfDay } from "https://esm.sh/date-fns@2.30.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Crie um cliente Supabase com permissões de administrador.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Verifique a autenticação do usuário.
    const authHeader = req.headers.get('Authorization')!
    const { data: { user } } = await createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. Verifique se o usuário é um administrador.
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (adminError || !admin) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 4. Se for admin, busque todos os dados do dashboard.
    const fromDate = startOfDay(subDays(new Date(), 7));
    const toDate = endOfDay(new Date());

    const [
      ordersResponse,
      productsResponse,
      customersResponse,
      recentOrdersResponse
    ] = await Promise.all([
      supabaseAdmin.from('orders').select('id, total_amount', { count: 'exact' }),
      supabaseAdmin.from('products').select('id', { count: 'exact' }),
      supabaseAdmin.from('profiles').select('id', { count: 'exact' }),
      supabaseAdmin
        .from('orders')
        .select('id, total_amount, created_at, profiles(full_name, email)')
        .gte('created_at', fromDate.toISOString())
        .lte('created_at', toDate.toISOString())
        .order('created_at', { ascending: false })
    ]);

    if (ordersResponse.error) throw ordersResponse.error;
    if (productsResponse.error) throw productsResponse.error;
    if (customersResponse.error) throw customersResponse.error;
    if (recentOrdersResponse.error) throw recentOrdersResponse.error;

    const totalRevenue = ordersResponse.data.reduce((acc, order) => acc + order.total_amount, 0);
    const totalSales = ordersResponse.count ?? 0;
    const totalProducts = productsResponse.count ?? 0;
    const totalCustomers = customersResponse.count ?? 0;

    const recentOrdersData = recentOrdersResponse.data;
    const salesByDayMap = new Map<string, number>();
    recentOrdersData.forEach(order => {
      const orderDate = format(new Date(order.created_at), 'yyyy-MM-dd');
      const currentTotal = salesByDayMap.get(orderDate) || 0;
      salesByDayMap.set(orderDate, currentTotal + order.total_amount);
    });

    const intervalDays = eachDayOfInterval({ start: fromDate, end: toDate });
    const chartData = intervalDays.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return {
        name: format(day, 'dd/MM'),
        total: salesByDayMap.get(dateKey) || 0,
      };
    });

    const recentOrders = recentOrdersData.slice(0, 5);

    const dashboardData = {
      totalRevenue,
      totalSales,
      totalProducts,
      totalCustomers,
      recentOrders,
      chartData,
    };

    return new Response(JSON.stringify(dashboardData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})