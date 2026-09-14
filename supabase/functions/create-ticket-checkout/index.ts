import Stripe from 'npm:stripe@18.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};
Deno.serve(async req=>{if(req.method==='OPTIONS')return new Response('ok',{headers:cors});let orderId:string|undefined;try{
 const authorization=req.headers.get('Authorization');if(!authorization)throw new Error('Authentication required');
 const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const user=createClient(url,anon,{global:{headers:{Authorization:authorization}}});const admin=createClient(url,service);
 const {data:auth,error:authError}=await user.auth.getUser();if(authError||!auth.user)throw new Error('Your session has expired');
 const body=await req.json() as {ticketTypeId?:string;quantity?:number};
 const {data:order,error:orderError}=await user.rpc('create_pending_ticket_order',{target_ticket_type_id:body.ticketTypeId,target_quantity:body.quantity}).single();
 if(orderError)throw orderError;orderId=order.id;
 let {data:billing,error:billingReadError}=await admin.from('billing_customers').select('stripe_customer_id').eq('user_id',auth.user.id).maybeSingle();if(billingReadError)throw billingReadError;
 let customerId=billing?.stripe_customer_id;if(!customerId){const stripe=new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);const customer=await stripe.customers.create({email:auth.user.email,metadata:{supabase_user_id:auth.user.id}});customerId=customer.id;const {error:billingWriteError}=await admin.from('billing_customers').insert({user_id:auth.user.id,stripe_customer_id:customerId});if(billingWriteError)throw billingWriteError;}
 const stripe=new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);const returnUrl=`${url}/functions/v1/stripe-return`;
 const session=await stripe.checkout.sessions.create({mode:'payment',payment_method_types:['card'],customer:customerId,line_items:[{quantity:order.quantity,price_data:{currency:'usd',unit_amount:order.unit_price_cents+order.unit_fee_cents,product_data:{name:`${order.event_title} — ${order.ticket_type_name}`,description:`Ticket $${(order.unit_price_cents/100).toFixed(2)} + service fee $${(order.unit_fee_cents/100).toFixed(2)}`}}}],success_url:`${returnUrl}?status=ticket-success`,cancel_url:`${returnUrl}?status=ticket-cancelled`,expires_at:Math.floor(new Date(order.expires_at).getTime()/1000),client_reference_id:auth.user.id,metadata:{kind:'paid_ticket',order_id:order.id,supabase_user_id:auth.user.id}});
 const {error:sessionWriteError}=await admin.from('ticket_orders').update({stripe_checkout_session_id:session.id}).eq('id',order.id);if(sessionWriteError)throw sessionWriteError;
 return Response.json({url:session.url},{headers:cors});
}catch(error){if(orderId){const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);await admin.rpc('release_pending_ticket_order',{target_order_id:orderId});}return Response.json({error:error instanceof Error?error.message:'Checkout failed'},{status:400,headers:cors});}});
