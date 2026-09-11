Deno.serve(req => {
  const status = new URL(req.url).searchParams.get('status');
  const success = status === 'success';
  const portal = status === 'portal';
  const title = success ? 'Payment received' : portal ? 'Membership updated' : 'Checkout cancelled';
  const message = success
    ? 'Return to the Vibe Districts app. Your membership will update after Stripe confirms the payment.'
    : portal
      ? 'Return to the Vibe Districts app. Your billing changes will appear shortly.'
      : 'No payment was taken. You can return to the app and try again.';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{background:#080706;color:#f7f1e8;font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0}.card{max-width:480px;padding:40px;text-align:center}h1{color:#dfbe7a}p{line-height:1.6;color:#bbb}</style></head><body><main class="card"><h1>${title}</h1><p>${message}</p></main></body></html>`;
  const headers = new Headers();
  headers.set('Content-Type', 'text/html; charset=UTF-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(html, { status: 200, headers });
});
