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
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: auth, error: authError } = await userClient.auth.getUser();
    if (authError || !auth.user) throw new Error('Your session has expired');
    const { data: profile, error: profileError } = await admin.from('profiles').select('email, role, is_active').eq('id', auth.user.id).single();
    if (profileError || !profile?.is_active || profile.role !== 'customer') throw new Error('A customer account is required');

    const body = await req.json() as { plan?: 'monthly' | 'annual' };
    if (body.plan !== 'monthly' && body.plan !== 'annual') throw new Error('Choose a valid membership plan');
    const priceId = Deno.env.get(body.plan === 'monthly' ? 'STRIPE_MONTHLY_PRICE_ID' : 'STRIPE_ANNUAL_PRICE_ID');
    if (!priceId) throw new Error('Stripe price is not configured');

    const { data: existing } = await admin.from('billing_customers').select('stripe_customer_id').eq('user_id', auth.user.id).maybeSingle();
    let customerId = existing?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        metadata: { supabase_user_id: auth.user.id },
      });
      customerId = customer.id;
      const { error } = await admin.from('billing_customers').insert({ user_id: auth.user.id, stripe_customer_id: customerId });
      if (error) throw error;
    }

    const returnUrl = `${supabaseUrl}/functions/v1/stripe-return`;
    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${returnUrl}?status=success`,
      cancel_url: `${returnUrl}?status=cancelled`,
      allow_promotion_codes: true,
      client_reference_id: auth.user.id,
      metadata: { supabase_user_id: auth.user.id, plan: body.plan },
      subscription_data: { metadata: { supabase_user_id: auth.user.id, plan: body.plan } },
    });
    return Response.json({ url: checkout.url }, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout could not be created';
    return Response.json({ error: message }, { status: 400, headers: corsHeaders });
  }
});
