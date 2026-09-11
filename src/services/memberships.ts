import { supabase } from '../lib/supabase';
import { Membership, MembershipPlan } from '../types';

function client() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

function mapMembership(row: Record<string, any>): Membership {
  return {
    active: row.status === 'active' && new Date(row.current_period_end).getTime() > Date.now(),
    plan: row.plan,
    homeCity: row.home_city,
    creditsRemaining: row.credits_remaining,
    creditsTotal: row.credits_total,
    renewalDate: row.current_period_end,
  };
}

export async function getMembership(): Promise<Membership | null> {
  const { data, error } = await client().from('memberships').select('*').maybeSingle();
  if (error) throw error;
  return data ? mapMembership(data) : null;
}

export async function createMembershipCheckout(plan: MembershipPlan): Promise<string> {
  const { data, error } = await client().functions.invoke('create-stripe-checkout', { body: { plan } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.url) throw new Error('Stripe Checkout URL was not returned.');
  return data.url as string;
}

export async function createBillingPortal(): Promise<string> {
  const { data, error } = await client().functions.invoke('create-stripe-portal');
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.url) throw new Error('Stripe billing portal URL was not returned.');
  return data.url as string;
}
