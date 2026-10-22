import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { CATALOG } from "../src/lib/catalog.ts";

const outputRoot = "docs/audits/2026-10-21";
const containers = {
  local: "supabase_db_home-care-assistant",
};
const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim().replace(/\s+/g, " ");
const normalizedAliases = (aliases) => [...new Set(aliases.map(normalize))].sort();

function readOnly(container, query) {
  if (!Object.values(containers).includes(container)) throw new Error("Unknown catalogue audit target.");
  const actual = execFileSync("docker", ["inspect", "--format", "{{.Name}}", container], { encoding: "utf8" }).trim();
  if (actual !== `/${container}`) throw new Error("Catalogue audit container identity mismatch.");
  const raw = execFileSync("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-X", "-qAt", "-v", "ON_ERROR_STOP=1"], {
    input: `begin read only;\n${query}\ncommit;\n`, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"],
  });
  return JSON.parse(raw.trim());
}

function snapshot(container) {
  const metadata = readOnly(container, `select jsonb_build_object(
    'migrationCount',(select count(*) from supabase_migrations.schema_migrations),
    'lastMigration',(select max(version) from supabase_migrations.schema_migrations),
    'hasPatientCatalogue',to_regclass('public.care_recipient_products') is not null);`);
  const products = readOnly(container, `select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'name',name,'category',category,'unit',unit,'aliases',aliases,
    'active',is_active) order by id),'[]'::jsonb) from public.products
    ${metadata.hasPatientCatalogue ? "where owner_care_recipient_id is null" : ""};`);
  // Patient names, observations, addresses, profiles and destinations are never
  // queried. Opaque IDs are used only in memory to count local customizations.
  const patientDefinitions = metadata.hasPatientCatalogue ? readOnly(container,
    `select coalesce(jsonb_agg(jsonb_build_object(
      'scope',care_recipient_id,'id',product_id,'name',name,'category',category,
      'unit',unit,'aliases',aliases,'active',is_active)),'[]'::jsonb)
      from public.care_recipient_products;`) : [];
  const patientCounts = readOnly(container, `select jsonb_build_object(
    'patientCount',count(*)${metadata.hasPatientCatalogue ? `,
    'emptyCatalogueCount',count(*) filter(where not exists(select 1
      from public.care_recipient_products c where c.care_recipient_id=r.id))` : ""})
    from public.care_recipients r;`);
  return { metadata, products, patientDefinitions, patientCounts };
}

function compare(expected, actual) {
  const expectedMap = new Map(expected.map((item) => [item.id, item]));
  const actualMap = new Map(actual.map((item) => [item.id, item]));
  const attributes = [];
  for (const [id, wanted] of expectedMap) {
    const found = actualMap.get(id);
    if (!found) continue;
    for (const field of ["name", "category", "unit", "active"]) {
      if (wanted[field] !== found[field]) attributes.push({ id, field, expected: wanted[field], actual: found[field] });
    }
    if (JSON.stringify(normalizedAliases(wanted.aliases)) !== JSON.stringify(normalizedAliases(found.aliases))) {
      attributes.push({ id, field: "aliases", expected: normalizedAliases(wanted.aliases), actual: normalizedAliases(found.aliases) });
    }
  }
  return {
    expectedCount: expected.length, actualCount: actual.length,
    missingIds: [...expectedMap.keys()].filter((id) => !actualMap.has(id)),
    unexpectedIds: [...actualMap.keys()].filter((id) => !expectedMap.has(id)),
    attributeDifferences: attributes,
  };
}

function ambiguities(products, exposeTerms = true) {
  const terms = new Map();
  for (const item of products) for (const value of new Set([item.name, ...item.aliases].map(normalize))) {
    if (!terms.has(value)) terms.set(value, new Set());
    terms.get(value).add(item.id);
  }
  const ambiguous = [...terms].filter(([, ids]) => ids.size > 1);
  return exposeTerms ? ambiguous.map(([term, ids]) => ({ term, productIds: [...ids].sort() })) : ambiguous.length;
}

const expected = CATALOG.map((item) => ({ ...item, active: true }));
const local = snapshot(containers.local);
const modelMap = new Map(local.products.map((item) => [item.id,item]));
const scopes = new Map();
const overrides = {name:0,category:0,unit:0,aliases:0,active:0};
let exclusive=0;
for (const definition of local.patientDefinitions) {
  if(!scopes.has(definition.scope))scopes.set(definition.scope,[]);
  scopes.get(definition.scope).push(definition);
  const model=modelMap.get(definition.id);
  if(!model){exclusive++;continue;}
  for(const field of ["name","category","unit","active"])if(definition[field]!==model[field])overrides[field]++;
  if(JSON.stringify(normalizedAliases(definition.aliases))!==JSON.stringify(normalizedAliases(model.aliases)))overrides.aliases++;
}
const report={generatedAt:new Date().toISOString(),method:"Local development database; BEGIN READ ONLY; no patient identities queried.",reference:{source:"src/lib/catalog.ts",sha256:createHash("sha256").update(readFileSync("src/lib/catalog.ts")).digest("hex"),count:expected.length},local:{...local.metadata,...local.patientCounts,comparison:compare(expected,local.products),ambiguities:ambiguities(local.products),inactiveTemplateIds:local.products.filter((item)=>!item.active).map((item)=>item.id)},patientDefinitions:{count:local.patientDefinitions.length,scopes:scopes.size,exclusive,inactive:local.patientDefinitions.filter((item)=>!item.active).length,overrides,ambiguousTerms:[...scopes.values()].reduce((sum,items)=>sum+ambiguities(items,false),0)},limits:["Patient customizations are intentional capabilities, not automatic inconsistencies.","New patients start empty until explicit adoption.","Remote database reconciliation is recorded separately in EXECUTION.md."]};
writeFileSync(`${outputRoot}/CATALOGUE_AUDIT.json`,JSON.stringify(report,null,2)+"\n");
writeFileSync(`${outputRoot}/CATALOGUE_AUDIT.md`,`# Auditoria do catálogo local

Gerada em ${report.generatedAt} com consultas somente leitura.

- Referência: ${expected.length} modelos em src/lib/catalog.ts.
- Migrations locais: ${local.metadata.migrationCount}.
- Modelos cadastrados: ${local.products.length}.
- IDs ausentes: ${report.local.comparison.missingIds.length}.
- IDs inesperados: ${report.local.comparison.unexpectedIds.length}.
- Diferenças de atributos: ${report.local.comparison.attributeDifferences.length}.
- Termos globais ambíguos: ${report.local.ambiguities.length}.
- Definições locais próprias: ${report.patientDefinitions.count}.
- Definições inativas: ${report.patientDefinitions.inactive}.
- Definições exclusivas: ${exclusive}.

Nomes e IDs de pacientes não são incluídos. O JSON detalha modelos,
aliases, atributos divergentes e contagens agregadas das customizações.
Diferenças locais não são automaticamente erros; pacientes novos podem
começar com catálogo vazio. O catálogo de referência não governa o formulário.
A comparação remota pertence ao relatório de execução desta data.
`);
console.log("Local read-only catalogue comparison saved without patient identifiers.");
