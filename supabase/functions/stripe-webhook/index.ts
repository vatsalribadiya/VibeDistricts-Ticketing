import Stripe from 'npm:stripe@18.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const { data: billing, error: billingError } = await admin.from('billing_customers').select('user_id').eq('stripe_customer_id', customerId).single();
  if (billingError) throw billingError;
  const item = subscription.items.data[0] as any;
  const priceId = item?.price?.id as string | undefined;
  const monthlyPrice = Deno.env.get('STRIPE_MONTHLY_PRICE_ID');
  const annualPrice = Deno.env.get('STRIPE_ANNUAL_PRICE_ID');
  const plan = priceId === monthlyPrice ? 'monthly' : priceId === annualPrice ? 'annual' : null;
  if (!plan) throw new Error(`Unknown Stripe price: ${priceId}`);

  const active = ['active', 'trialing'].includes(subscription.status);
  const status = active ? 'active' : subscription.status === 'past_due' || subscription.status === 'unpaid' ? 'past_due' : subscription.status === 'canceled' ? 'cancelled' : 'expired';
  const periodStart = Number(item?.current_period_start ?? (subscription as any).current_period_start);
  const periodEnd = Number(item?.current_period_end ?? (subscription as any).current_period_end);
  if (!periodStart || !periodEnd) throw new Error('Stripe subscription period is missing');
  const total = plan === 'monthly' ? 2 : 24;
  const startIso = new Date(periodStart * 1000).toISOString();
  const endIso = new Date(periodEnd * 1000).toISOString();
  const { data: current } = await admin.from('memberships').select('current_period_start, credits_remaining').eq('user_id', billing.user_id).maybeSingle();
  const samePeriod = current?.current_period_start === startIso;

  const { error } = await admin.from('memberships').upsert({
    user_id: billing.user_id,
    plan,
    status,
    home_city: 'Washington, DC',
    credits_total: total,
    credits_remaining: samePeriod ? Math.min(current.credits_remaining, total) : total,
    current_period_start: startIso,
    current_period_end: endIso,
    payment_provider: 'stripe',
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

Deno.serve(async req => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing Stripe signature', { status: 400 });
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(), signature, Deno.env.get('STRIPE_WEBHOOK_SECRET')!, undefined, cryptoProvider,
    );
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Invalid signature', { status: 400 });
  }

  const { error: claimError } = await admin.from('stripe_webhook_events').insert({ event_id: event.id, event_type: event.type });
  if (claimError?.code === '23505') return new Response('Already processed', { status: 200 });
  if (claimError) return new Response(claimError.message, { status: 500 });

  try {
    if (event.type.startsWith('customer.subscription.')) {
      await syncSubscription(event.data.object as Stripe.Subscription);
    } else if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (typeof session.subscription === 'string') await syncSubscription(await stripe.subscriptions.retrieve(session.subscription));
    } else if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as any;
      const subscriptionRef = invoice.subscription ?? invoice.parent?.subscription_details?.subscription;
      const subscriptionId = typeof subscriptionRef === 'string' ? subscriptionRef : subscriptionRef?.id;
      if (subscriptionId) await syncSubscription(await stripe.subscriptions.retrieve(subscriptionId));
    }
    return new Response('ok', { status: 200 });
  } catch (error) {
    await admin.from('stripe_webhook_events').delete().eq('event_id', event.id);
    return new Response(error instanceof Error ? error.message : 'Webhook failed', { status: 500 });
  }
});
