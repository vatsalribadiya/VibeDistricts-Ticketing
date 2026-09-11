import Stripe from 'npm:stripe@18.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) throw new Error('Authentication is required');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } },
    });
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: auth, error: authError } = await userClient.auth.getUser();
    if (authError || !auth.user) throw new Error('Your session has expired');
    const { data: billing, error: billingError } = await admin
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('user_id', auth.user.id)
      .single();
    if (billingError || !billing) throw new Error('A Stripe membership was not found');

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
    const portal = await stripe.billingPortal.sessions.create({
      customer: billing.stripe_customer_id,
      return_url: `${supabaseUrl}/functions/v1/stripe-return?status=portal`,
    });
    return Response.json({ url: portal.url }, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Billing portal could not be opened';
    return Response.json({ error: message }, { status: 400, headers: corsHeaders });
  }
});
