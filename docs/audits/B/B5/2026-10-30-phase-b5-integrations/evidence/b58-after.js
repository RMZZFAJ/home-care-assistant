/* global window, document, performance */
async (page) => {
  await page.waitForTimeout(35000);
  const beforeReload = await page.evaluate(async () => {
    const sync = await fetch('/api/sync').then(r => r.json());
    const resources=performance.getEntriesByType('resource').map(x=>new URL(x.name).pathname);
    return {revision:sync.revision,events:window.__b5events,flowQueries:resources.filter(x=>x==='/api/whatsapp/flows/submissions').length,contextQueries:resources.filter(x=>x==='/api/context').length,bellQueries:resources.filter(x=>x==='/api/notifications').length,flowVisible:document.body.innerText.includes('Relato fictício B5 recebido com a tela aberta')};
  });
  await page.reload();
  await page.getByText('Relato fictício B5 recebido com a tela aberta',{exact:true}).waitFor();
  return {beforeReload,afterReloadVisible:true,method:'Real local Chrome, actual Auth/RPC/read-back; no Meta; only one directed consumer scenario'};
}
