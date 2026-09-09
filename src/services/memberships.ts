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

export async function activateDemoMembership(plan: MembershipPlan): Promise<Membership> {
  const { data, error } = await client().rpc('activate_demo_membership', { target_plan: plan }).single();
  if (error) throw error;
  return mapMembership(data as Record<string, any>);
}
