/* AUDIT ONLY. One-time correction of authored references against canonical inventory.
 * No product reads are claimed from these replacements; build validates every anchor. */
const {fs,path,dir}=require('./audit-lib.cjs');
const file=path.join(dir,'findings-data.cjs');let text=fs.readFileSync(file,'utf8');
const corrections={
"['src/components/documents/supply-wizard-step.tsx','products']":"['src/components/documents/supply-wizard-step.tsx','catalog']",
"['src/components/admin/admin-console.tsx','userId']":"['src/components/admin/membership-management.tsx','userId: form.get']",
"['src/app/globals.css','.ui-button']":"['src/app/design-system.css','.ui-button']",
"['src/theme/tokens.ts','export']":"['src/theme/tokens.css',':root']",
"['src/lib/server/document-pdf.ts','Estoque']":"['src/lib/server/operational-pdf.ts','RELAÇÃO DOS MATERIAIS']",
"['src/lib/server/document-pdf.ts','PDFDocument']":"['src/lib/server/document-pdf.ts','renderDocumentPdf']",
"['src/components/schedules/schedule-calendar.tsx','1024']":"['src/components/schedules/schedule-console.tsx','hca-agenda-mobile']",
"['src/components/requisitions/requisition-steps.tsx','observations.map']":"['src/components/requisitions/requisition-steps.tsx','rows={form.observations.filter']",
'b14-recovery-adminA-upload-unknown-after-commit.png':'b14-recovery-adminA-attachment-lost.png',
'Calendar força visão diária abaixo1024':'CSS/consumer força visão diária abaixo1024',
'COM de doação real mantém título compra no PDF e fluxo; BAL também serve reconto e legado, além de obrigação semanal.':'COM de doação real mantém título compra no PDF e fluxo; label HTML de BAL é semanal, enquanto o PDF já usa título geral de estoque. BAL também serve reconto e legado.',
'A origem está nos dados, e regime aparece no painel. O problema é expectativa do título.':'A origem está nos dados, o regime aparece no painel e o título PDF BAL já é geral. O problema é expectativa do título COM e coerência dos labels HTML BAL.'
};
for(const [a,b]of Object.entries(corrections))text=text.replaceAll(a,b);
const ids={'B1-UX-001':'SC-014','B1-UX-002':'SC-011;SC-015;SC-016;OVL-039','B1-UX-003':'SC-034','B1-TEXT-001':'SC-007;SC-039;SC-040;SC-034','B1-NAV-001':'SC-036;SC-037;SC-038','B1-TEXT-002':'SC-010;SC-012;SC-046;SC-048','B1-TEXT-003':'SC-006','B1-ERR-001':'SC-039;SC-040','B1-ERR-002':'SC-001;SC-007;SC-039;SC-037','B1-ERR-003':'SC-032','B1-STATE-001':'SC-019;SC-036;SC-033;SC-037','B1-STATE-002':'SC-013;SC-016','B1-STATE-003':'SC-016','B1-STATE-004':'SC-009;SC-010;SC-012;SC-039','B1-FORM-002':'SC-009;SC-035','B1-FORM-003':'SC-003;SC-004;SC-036','B1-FORM-004':'SC-010;SC-011','B1-FORM-005':'SC-035','B1-FORM-006':'SC-022','B1-FORM-007':'SC-031','B1-UX-005':'SC-009;SC-010;SC-012','B1-VIS-001':'SC-001;SC-009;SC-031','B1-UX-006':'SC-039;SC-040','B1-UX-007':'SC-019;SC-028','B1-FEED-001':'SC-019;SC-039','B1-A11Y-002':'SC-014;SC-024','B1-NAV-002':'SC-014','B1-UX-008':'SC-039;SC-040'};
for(const [id,value]of Object.entries(ids))text=text.replace(new RegExp("(id:'"+id+"'.*?surfaces:')([^']*)(')"),(_,a,_old,c)=>a+value+c);
fs.writeFileSync(file,text);console.log('Author references reconciled; build must still validate them.');
