/* global window, document, performance */
async (page) => {
  await page.getByRole('heading', {name:'Relatos recebidos por Flow'}).waitFor();
  return await page.evaluate(async () => {
    const sync = await fetch('/api/sync').then(r => r.json());
    window.__b5events = 0;
    window.addEventListener('hca:data-changed', () => window.__b5events++);
    performance.clearResourceTimings();
    return {revision:sync.revision,flowVisible:document.body.innerText.includes('Relato fictício B5 recebido com a tela aberta')};
  });
}
