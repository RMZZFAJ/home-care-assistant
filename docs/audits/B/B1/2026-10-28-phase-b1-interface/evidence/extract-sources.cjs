/* AUDIT ONLY. Read-only for product/database; writes indexes only inside B1. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');
const {execFileSync} = require('node:child_process');
const root = process.cwd();
const out = path.join(root, 'docs/audits/2026-10-28-phase-b1-interface');
const paths = execFileSync('git',['ls-files','src','tests/e2e','tests/unit'],{encoding:'utf8'}).trim().split(/\r?\n/);
const records = [], literals = [], controls = [], elements = [];
for (const file of paths) {
  if (!/\.(?:tsx?|css|json)$/.test(file)) continue;
  const content = fs.readFileSync(file,'utf8');
  const kind = /src\/(components|theme)\/|src\/app\/.*(?:page|layout)\.tsx|src\/app\/.*\.css/.test(file) ? 'UI' : /src\/lib\/|src\/types\//.test(file) ? 'CONTRACT_OR_TEXT' : /src\/app\/(api|auth)\//.test(file) ? 'API_VISIBLE_ERRORS' : 'ASSOCIATED_TEST';
  const sf = ts.createSourceFile(file,content,ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const line = n => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line+1;
  const imports = [];
  function visit(n) {
    if(ts.isImportDeclaration(n)) imports.push({module:n.moduleSpecifier.text,clause:n.importClause?.getText(sf)||''});
    if(ts.isJsxText(n)&&n.text.trim()) literals.push({file,line:line(n),kind:'JSX_TEXT',value:n.text.replace(/\s+/g,' ').trim(),context:n.parent.tagName?.getText(sf)||n.parent.kind});
    if(ts.isStringLiteralLike(n)||ts.isTemplateExpression(n)) {
      const value=ts.isTemplateExpression(n)?n.getText(sf):n.text;
      const p=n.parent;
      const attribute=ts.findAncestor(n,a=>ts.isJsxAttribute(a));
      if(!ts.isImportDeclaration(p)&&!ts.isExportDeclaration(p)) literals.push({file,line:line(n),kind:ts.isTemplateExpression(n)?'DYNAMIC_TEMPLATE':ts.isJsxAttribute(p)?'JSX_ATTRIBUTE':'STRING',value,attribute:attribute?.name.getText(sf)||'',context:p.getText(sf).slice(0,400)});
    }
    if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n)) {
      const tag=n.tagName.getText(sf), attrs={};
      for(const a of n.attributes.properties) if(ts.isJsxAttribute(a)) attrs[a.name.getText(sf)]=a.initializer?.getText(sf)||'true';
      const parent=n.parent;
      const text=ts.isJsxElement(parent)?parent.children.map(x=>x.getText(sf)).join(' ').replace(/\s+/g,' ').slice(0,700):'';
      const item={file,line:line(n),tag,attrs,text};
      elements.push(item);
      if(/^(input|select|textarea|Input|Select|Textarea|Checkbox|Switch|Radio|Combobox|Dropdown|SpinButton|Slider|Field|Button|button|ConfirmDialog|RecordDrawer|SettingsSection|Dialog|Tab|a|Link)$/.test(tag)) controls.push(item);
    }
    ts.forEachChild(n,visit);
  }
  visit(sf);
  records.push({file,kind,lines:content.split(/\r?\n/).length,sha256:crypto.createHash('sha256').update(content).digest('hex'),imports,static_review:'NOT_VERIFIED',reason:'Structural extraction; semantic review tracked separately.'});
}
const data={generatedAt:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),method:'TypeScript AST extraction; candidate inventory, not semantic approval',records,literals,controls,elements};
fs.writeFileSync(path.join(out,'evidence/source-index.json'),JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({files:records.length,ui:records.filter(x=>x.kind==='UI').length,literalCandidates:literals.length,controlCandidates:controls.length}));
