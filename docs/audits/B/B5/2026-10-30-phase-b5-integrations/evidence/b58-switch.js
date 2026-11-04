/* global document */
async (page) => {
  const original = await page.evaluate(async () => {
    const patient=document.querySelector('[data-context-patient]').getAttribute('data-context-patient');
    const result=await fetch('/api/whatsapp/flows/submissions?careRecipientId='+patient).then(r=>r.json());
    return result.data[0].id;
  });
  const loaded=page.waitForResponse(r=>r.url().includes('/api/whatsapp/flows/submissions?')&&r.status()===200);
  await page.getByRole('combobox',{name:'Pessoa assistida'}).selectOption({label:'Residência fictícia B5 atualização 2'});
  await loaded;
  await page.locator('main').getByText('Residência fictícia B5 atualização 2',{exact:true}).waitFor();
  const state=await page.evaluate(() => ({oldReviewText:Array.from(document.querySelectorAll('textarea')).some(x=>x.value==='Relato fictício B5 recebido com a tela aberta'),emptyNewPatient:document.body.innerText.includes('Nenhuma sugestão pendente de confirmação.')}));
  const denied = await page.evaluate(async id => {
    const response=await fetch('/api/whatsapp/flows/submissions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id,accept:false,kind:'shortage',text:'Tentativa fictícia B5 no contexto diferente',lines:[]})});
    return {status:response.status,code:(await response.json()).code};
  },original);
  return {id:'B58-U02',...state,denied,method:'Actual context switch and completed200 GET, old selection remains; browser HTTP mutation rejected, pending must be read back independently'};
}
