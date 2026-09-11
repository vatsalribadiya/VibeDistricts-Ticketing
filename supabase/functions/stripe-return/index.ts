Deno.serve(req => {
  const success = new URL(req.url).searchParams.get('status') === 'success';
  const title = success ? 'Payment received' : 'Checkout cancelled';
  const message = success
    ? 'Return to the Vibe Districts app. Your membership will update after Stripe confirms the payment.'
    : 'No payment was taken. You can return to the app and try again.';
  return new Response(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#080706;color:#f7f1e8;font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0}.card{max-width:480px;padding:40px;text-align:center}h1{color:#dfbe7a}p{line-height:1.6;color:#bbb}</style></head><body><main class="card"><h1>${title}</h1><p>${message}</p></main></body></html>`, { headers: { 'content-type': 'text/html; charset=utf-8' } });
});
