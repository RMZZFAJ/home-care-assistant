"""Update living guidance and format owner inputs; preserve dated audit text."""
from pathlib import Path
import csv
import hashlib
import re

ROOT=Path(__file__).resolve().parents[4]
OUT=Path(__file__).resolve().parent
changes=[]
def update(relative,text,reason):
    path=ROOT/relative;old=path.read_bytes() if path.exists() else b''
    new=text.encode('utf-8')
    if new!=old:
        path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(new)
        changes.append({'path':relative,'before_sha256':hashlib.sha256(old).hexdigest(),'after_sha256':hashlib.sha256(new).hexdigest(),'reason':reason})
def current(name):return (ROOT/'docs/current'/name).read_text(encoding='utf-8')
def replace(text,old,new):
    assert old in text,old[:90]
    return text.replace(old,new,1)
def caveat(text,body):
    first,rest=text.split('\n',1)
    return first+'\n\nContrato AS_IS da base funcional `37cb7f85e96e551d6419871f94dd950712e2565b`.\n'+body+'\nEstado e limites: [PROJECT_STATUS](PROJECT_STATUS.md). Planejamento futuro\nem [C](../audits/C/README.md); decisões aprovadas não equivalem a implementação.\n'+rest

readme='''# Home Care Assistant

Gestão operacional por paciente com Next.js, React, TypeScript e Supabase.
REQ, COM, ENT e BAL distinguem necessidade, aquisição, entrega, contagem,
ciência e estoque por movimentos. O sistema não prescreve ou decide conduta clínica.

## Estado e documentação

**Produção NO-GO.** A e B1–B8 estão encerradas como diagnóstico; C conclui o
planejamento documental. **D NÃO INICIADA.** Base funcional auditada:
`37cb7f85e96e551d6419871f94dd950712e2565b`. O estado de deploy produtivo
nesta missão é NOT_VERIFIED; preview documental não é homologação do produto.

- [Portal por público](docs/README.md).
- [Estado por fonte e SHA](docs/current/PROJECT_STATUS.md).
- [Contratos implementados e desvios conhecidos](docs/current/README.md).
- [Decisões humanas](docs/decisions/README.md) e [projeto C](docs/audits/C/README.md).
- [Auditorias preservadas](docs/audits/README.md) e [plano D](docs/audits/D/README.md).

PWA/push, modalidades futuras de ciência, rascunhos entre aparelhos e verificador
de exemplar são requisitos planejados; não são anunciados como implementados.
Os dois P1 herdados continuam abertos até correção/regressão autorizada.

## Desenvolvimento

Use Node24.22.0 e npm11.21.1 dos arquivos de versão; lockfile e versões exatas.

```sh
npm ci
npm run dev
```

Configure o ambiente local conforme `.env.example`, sem chave de serviço no
browser. A stack de desenvolvimento/testes é home-care-assistant, API
127.0.0.1:54321 e DB127.0.0.1:54322. Não criar outra stack para a suíte.
Antes de preparo, fixtures ou replay, ler [Testes](docs/current/TESTING.md):
esses comandos podem aplicar migrations ou substituir dados e exigem as guardas,
consentimento e backup pertinentes. Nunca executar testes mutáveis no remoto.

## Validação e autorização

Mudança funcional autorizada usa os gates de contratos, lint, Markdown, tipos,
unitários/build e, conforme contrato, banco/Auth/E2E pelo runner local. Os comandos
e marcos estão no guia de testes; não há afirmação de CI verde atual baseada em
PR antigo. Nesta C, verificações são documentais e de preservação; não se repetem
suítes funcionais por alteração editorial. Deploy, migrations remotas, envio,
PR e merge dependem de autorização específica, nunca de relato histórico.
'''
update('README.md',readme,'Replace stale release counts and authorizations with canonical state and safe entrypoints')

agents=(ROOT/'AGENTS.md').read_text(encoding='utf-8')
agents=replace(agents,'Não alterar migrations históricas; check:contracts verifica as primeiras 19.','Não alterar migrations históricas; o manifesto de check:contracts protege as\n84 migrations do baseline atual. Conferir a contagem no manifesto ao evoluir.')
agents=replace(agents,'Consulte a auditoria\ndatada e seu checkpoint para retomar trabalho sem recriar funções existentes.','Consulte docs/README.md, docs/current/PROJECT_STATUS.md, a auditoria datada\ne seu checkpoint para retomar sem recriar funções existentes. Decisões em\ndocs/decisions e planos C descrevem futuro, não comportamento implementado.\nAutorização corrente vem da missão vigente; relatos históricos não a renovam.')
agents=replace(agents,'Usar Node e npm dos arquivos de versão. Rodar check:contracts, lint,','Quando autorizado a implementar, usar Node e npm dos arquivos de versão.\nRodar check:contracts, lint,')
agents += '\nPara mudanças exclusivamente documentais, validar Markdown, links, referências\ne preservação proporcionalmente. Não repetir suítes funcionais sem mudança de\ncontrato ou hipótese nova. Auditoria/plano não autorizam corrigir produto.\n'
update('AGENTS.md',agents,'Permanent source hierarchy and proportional documentation checks; Next managed block retained')

text=current('ARCHITECTURE.md')
text=replace(text,'REQ concluída com ciência obrigatória pendente conserva a exceção que exige','REQ concluída com ciência obrigatória pendente conserva a exceção que exige')
text=replace(text,'O agendador\nseleciona apenas trabalho vencido e não processa importações históricas como\npendências atuais.','O contrato exige trabalho elegível e não trata importações históricas como\npendências atuais; A DB-002/B3-001 demonstra que candidaturas terminais ainda\npodem bloquear o lote REQ. Isso permanece defeito aberto, separado do cursor BAL.')
text=replace(text,'O preview online utiliza o Supabase remoto autorizado, com migrations\nincrementais, sem reset nem fixtures. Consulte\n[Execução](../archive/evolution/EXECUTION.md) para evidências e limitações atuais.','O destino efetivo de preview/produção precisa de verificação atual e autorização.\nNão inferir configuração ou release do relato datado em\n[Execução histórica](../archive/evolution/EXECUTION.md). Estado corrente em\n[PROJECT_STATUS](PROJECT_STATUS.md).')
text=caveat(text,'Riscos conhecidos incluem progresso REQ, autoridade após espera, frescor e\nsemântica de ciência. Descrição de invariante não elimina os desvios A/B.')
update('docs/current/ARCHITECTURE.md',text,'Qualify intended guarantees with demonstrated defects and separate historical deployment')

text=current('DATABASE.md')
text=replace(text,'das primeiras 63 entre Windows e Linux; toda evolução usa novos arquivos.','das84 migrations do baseline entre Windows e Linux; toda evolução usa novos\narquivos. A quantidade vigente é derivada de scripts/historical-migrations.json.')
text=replace(text,'ficam na [execução](../archive/evolution/EXECUTION.md), separados destas regras permanentes.','ficam no [estado por SHA](PROJECT_STATUS.md), separados destas regras permanentes.')
text=caveat(text,'B3 registra exceções em precisão, NULL/NaN, revisão BAL legado, sessão\ndireta e revogação em espera. O guard e os contratos corretos devem ser preservados.')
update('docs/current/DATABASE.md',text,'Current migration count and scoped AS_IS caveats')

text=current('SECURITY.md')
text=caveat(text,'Garantias exigidas abaixo têm desvios delimitados em B3/B4: JWT encerrado\nainda alcança perfil/avatar diretos, há janela após lock e URL já emitida\nmantém TTL. Sanitização também tem perda visível B6-008; não alegar fidelidade\nintegral. Ver política pendente P15 antes de prometer revogação instantânea.')
text=replace(text,'definidos pelo controlador. Resultados reais e limites da revisão ficam na\n[matriz](../archive/evolution/EXECUTION.md); não presumir homologação externa.','definidos pelo controlador. Resultados atuais e limites ficam em\n[PROJECT_STATUS](PROJECT_STATUS.md); execuções arquivadas são datadas, não\ncomprovação atual de homologação externa.')
update('docs/current/SECURITY.md',text,'Keep invariants and identify current exceptions without claiming fixes')

text=current('API.md')
text=caveat(text,'Precisão number/string, etapa parcialmente confirmada, paginação e\nclassificação de erro têm desvios B4. Correção de estoque sem referência ainda\né aceita por caminhos diretos B3-005, apesar do contrato exigido abaixo.')
text=replace(text,'As quantidades são strings decimais normalizadas, limitadas à precisão da\nunidade, com teto e validação também na RPC.','O contrato requer quantidades exatas e limitadas à precisão da unidade; a\nvalidação atual aceita string ou number e B4-001 prova arredondamento indevido\nno braço number. Não apresentar o requisito de exatidão como garantia integral\njá corrigida.')
update('docs/current/API.md',text,'Distinguish required API contract from observed implementation deviations')

text=current('TESTING.md')
text=caveat(text,'C não executou testes funcionais. B8 demonstra lacunas de oráculo PDF,\nNULL SQL, revisão axe e readiness do helper; verde parcial não homologa produto.')
text=replace(text,'exclui .env, Git e caches e executa instalação limpa, lint, tipos, testes e build.\nNão utiliza banco nem credenciais remotas.','exclui .env, Git e caches, mas B8-M004 demonstra que a lista atual não exclui\n.private/.venv. Não executar essa exportação sobre workspace com conteúdo\nprivado até correção autorizada D0. O objetivo é instalação limpa/lint/tipos/\ntestes/build; a falha de fronteira de arquivo não foi corrigida nesta C.')
text+='\n## Documentação e auditorias datadas\n\nPara C/editorial, validar Markdown, links, matrizes e hashes. Não executar\nprobes históricos para atualizar relatórios: podem alterar fixtures ou\nsobrescrever evidência. Caminhos anteriores ficam no mapa de relocação;\nscripts datados exigem adaptação/guardas antes de reutilizar em D0.\n'
update('docs/current/TESTING.md',text,'Testing limitations and proportional documentary verification; preserve functional commands')

text=current('OPERATIONS.md')
text=caveat(text,'Este guia descreve percursos existentes e invariantes; B2/B3 mostram\nexceções sem conclusão adequada em COM parcial, cancelamento ENT com consumo,\nsucessão, relato textual e produto inativo. Não há aprovação de operação real.')
text=replace(text,'Consulte os resultados reais em\n[Execução](../archive/evolution/EXECUTION.md); não presumir homologação do provedor.','Consulte [estado e limites atuais](PROJECT_STATUS.md);\n[execução arquivada](../archive/evolution/EXECUTION.md) é fotografia histórica,\nsem homologação atual presumida do provedor.')
update('docs/current/OPERATIONS.md',text,'Current operational limitations and future specification boundary')

text=current('DEPLOYMENT.md')
start=text.index('A autorização de 22/10/2026')
end=text.index('Use o perfil nomeado home-care-assistant',start)
text=text[:start]+'''Autorizações de22/10/2026 pertencem à execução histórica e não autorizam\nmigration, PR, merge ou deploy nesta missão. Conferir autorização vigente e\ndestino antes de qualquer ação remota. C autoriza somente documentação e push\nna branch; eventual preview automático foi autorizado, sem promoção de produção.\n\n'''+text[end:]
text=replace(text,'O preview\naprovado reutiliza o Supabase remoto existente.','O destino de preview\nprecisa ser explicitamente identificado e autorizado; seu estado atual não\nfoi homologado por esta C.')
text=replace(text,'[EXECUTION.md](../archive/evolution/EXECUTION.md).','[PROJECT_STATUS.md](PROJECT_STATUS.md); EXECUTION arquivada é histórica.')
text=caveat(text,'Procedimento abaixo é orientação para futura execução autorizada, não\nautorização. B7-001/003 exigem gate do candidato/schema/config e restore\nainda não comprovado; C não alterou CI, Vercel ou ambiente real.')
update('docs/current/DEPLOYMENT.md',text,'Remove stale operational authorization and require candidate/schema/config gates')

status='''# Estado verificável do projeto

Referência editorial:04/11/2026, America/Sao_Paulo. **Produção NO-GO.**
Esta é a entrada canônica de estado; contratos atuais ficam em current,
decisões humanas em decisions e especificações futuras em audits/C.

| Referência | Estado e prova |
| --- | --- |
| product_code_sha | `37cb7f85e96e551d6419871f94dd950712e2565b`; comparação de todos os arquivos não documentais contra baseline C0 no fechamento C. |
| audit_input_sha | `227f26ca695a3d01512a854f4b19f2639b91ba87`, A/B1–B8 encerradas. |
| branch documental | `audit/phase-b`; SHA final de C é o commit que contém este estado, resolvível pelos comandos abaixo. Não gravar hash autorreferente no próprio manifesto. |
| master preservada | `34dcb835c5c49068e0417f7306eb4e501aa868bc`; sem merge em C. |
| last_production_deploy_sha | `NOT_VERIFIED` nesta missão. Resultados remotos B7 são históricos e não assumidos atuais. |
| Fase C | Planejamento C0–C6, decisões e reorganização; conclusão depende do relatório final de validação e commit/push documentais verificáveis. |
| Fase D | **NÃO INICIADA**; nenhuma correção funcional/migration/ativação realizada em C. |

```sh
git branch --show-current
git rev-parse HEAD
git log -1 --format=%H -- docs/audits/C
git ls-remote origin refs/heads/audit/phase-b
```

Os165 registros originais foram reconciliados em121 causas, com28 finalidades
aprovadas adicionais ao diagnóstico; não são149 defeitos novos. Existem30 DEC,
20 oportunidades e15 detalhes pendentes de decisão (P01–P12 originais e P13–P15
derivados). Os dois P1 de decisão de escala e progresso REQ seguem abertos.
O guard protege84 migrations; contagens de suítes anteriores ficam nos pacotes
datados e não são apresentadas como CI verde atual.

PWA/Web Push, modalidades futuras de ciência, draft cross-device e verificador
de exemplar estão planejados. WhatsApp/Meta/Flows permanecem diferidos para
ativação/homologação posterior; não remover contratos existentes. Backup com
TOC, emulação, screenshots e transporte controlado não substituem restore,
participante, aparelho/AT/impressão ou provedor real.

Consultar [C](../audits/C/README.md), [gate futuro](../audits/C/C5-execution-roadmap/RELEASE_CUTS_AND_GATES.md)
e [história A/B](../audits/README.md). Os históricos de PRs/deploys e autorizações
ficam em archive e auditorias datadas, sem renovar permissão corrente.
'''
update('docs/current/PROJECT_STATUS.md',status,'Single authoritative current state with verified baselines and honest production limit')
update('docs/current/ROADMAP.md','''# Continuidade do produto

O [estado canônico](PROJECT_STATUS.md) distingue produto implementado e plano.
C especifica o primeiro escopo completo e organiza [D0–D7 e D-LATER](../audits/C/C5-execution-roadmap/PHASE_D_WORK_PACKAGES.md).
D NÃO INICIADA; produção NO-GO. Não há cronograma/custo ou percentual inventado.

Primeiro: dois P1 e integridade de autoridade/quantidade; depois processos de
exceção e fontes documentais; recuperação/listas; PDFs/anexos verificáveis;
PWA/push; homologação humana, ambiente, restore e liberação do candidato.
Dependências e decisões Pxx estão no plano, sem escolha humana presumida.

WhatsApp/Meta/Flows, OCR/lote/validade e painel multipaciente aguardam evolução
conforme decisão. O10 é capacidade existente a preservar. Recursos próprios
de supervisão/leitura podem aguardar, sem ignorar política BAL ativa. Assinatura
adicional requer decisão P09; comparação de bytes é resultado aprovado.

Estoque institucional, fornecimento direto externo, financeiro e uma quinta
ficha não são introduzidos por este plano. Qualquer ampliação exige escopo e
autorização próprios. Não confundir relato de PR antigo com trabalho atual.
''','Replace historical roadmap with current scope and links to conditional D plan')
update('docs/current/AUDIT.md','''# Auditoria e rastreabilidade

Fonte atual de estado: [PROJECT_STATUS](PROJECT_STATUS.md).
O [portal A/B/C/D](../audits/README.md) organiza diagnósticos preservados,
planejamento e execução futura.20/21deoutubro são precursores históricos;
A é prontidão formal, B1–B8 aprofundamentos, C especificação/decisão e D
permanece não iniciada. Nenhum relatório antigo renova autorização de operação.

[Crosswalk de165IDs](../audits/C/C1-consolidation/FINDINGS_165_SOURCE_CROSSWALK.csv)
liga fonte → causa → decisão → especificação → lote → aceite. As121 causas
distinguem defeito, risco, lacuna, qualidade, decisão e homologação. Prova
estática, controlada, local, humana, física e externa mantém sua classe.

Evidências e manifestos históricos preservam bytes; mudanças editoriais de
links têm log e hashes próprios, sem recalcular manifesto antigo. O
[mapa de relocação](../RELOCATION_MAP.csv) resolve literais datados. Instrumentos
históricos não devem ser reexecutados como verificadores atuais: podem gravar
fixtures ou sobrescrever provas. Ver o relatório C6 de integridade/limitações.

Uma feature só recebe aceite quando UI/API/banco/autoria/ledger/documentos e
recuperação pertinentes têm prova. Existência de código,200, teste de estrutura
ou screenshot não comprova o fluxo integral. C não transforma plano em correção
e não certifica produção, aparelho, impressão ou provedor.
''','Canonical audit taxonomy and provenance instead of historical authorization')

text=current('WHATSAPP_AI.md')
text=replace(text,'Não inclui nome do paciente, medicamentos ou observações nas mensagens.','O conteúdo atual pode incluir nome do paciente, material/saldo e PDF; B5-005\ndemonstra que a minimização anunciada anteriormente não é uma garantia técnica.\nA matriz de campos/destinos e retenção precisa de aprovação antes de ativar.')
text=replace(text,'de forma idempotente, sem regredir estados já confirmados.','com controles idempotentes, mas B5-013 demonstra correlação incorreta entre\ntentativa antiga e lease nova. Não tratar todo callback/retry como homologado.')
text=replace(text,'O comando\n`node scripts/meta-templates.mjs` grava diagnóstico privado e, com token válido,\nconsulta ou submete os cinco prioritários e registra cada resultado.','O utilitário\n`scripts/meta-templates.mjs` mistura consulta/submissão ao encontrar token,\nconforme REPO-003/B8-M003. Não executá-lo como diagnóstico com credencial; D0/D7\nprecisam separar inspect/submit e obter autorização específica de publicação.')
text=replace(text,'O estado verificado consta em [EXECUTION.md](../archive/evolution/EXECUTION.md).','O estado corrente e seus limites constam em [PROJECT_STATUS](PROJECT_STATUS.md);\nEXECUTION arquivada não é homologação atual.')
start=text.index('## Preparação da conta de teste Meta')
text=text[:start]+'''## Homologação posterior, ainda diferida\n\nDados de conta/erro130497 e preparações anteriores são contexto histórico em\n[execução arquivada](../archive/evolution/EXECUTION.md) e B5. Não assumir que\ntoken, conta, aprovação ou configuração continuam válidos. Nenhuma credencial\nfoi solicitada ou consultada nesta C. DEC-019 mantém Meta/Flows diferidos;\nminimização, templates, publicação, criptografia, callbacks e recuperação\nprecisam de homologação real em D7 autorizado.\n\nPWA/Web Push e notificações internas futuras estão no plano C; não existe\ntransporte e-mail operacional ou transcrição homologados pelo simples fato de\nhaver preferência/adaptador. Auth SMTP/SMS/OAuth são fronteiras próprias.\n'''
text=caveat(text,'Integrações existentes são contratos locais, não canais externamente\nhomologados. DEC-019 adia Meta/Flows; C não enviou mensagem ou configurou provedor.')
update('docs/current/WHATSAPP_AI.md',text,'Correct unguaranteed minimization and retry claims; remove stale account readiness')

for relative in ['docs/decisions/PRODUCT_DECISIONS_MASTER.md','docs/audits/C/C0-baseline/mandate/PHASE_C_MASTER_ORDER.md','docs/audits/C/C0-baseline/mandate/PHASE_C_SUBPHASES.md','docs/audits/C/C0-baseline/mandate/DOCS_REORGANIZATION_POLICY.md']:
    text=(ROOT/relative).read_text(encoding='utf-8')
    seen=False;lines=[]
    for line in text.splitlines():
        if line.startswith('# '):
            if seen:line='#'+line
            seen=True
        if line.startswith('#') and lines and lines[-1].strip():lines.append('')
        lines.append(line)
        if line.startswith('#'):lines.append('')
    update(relative,'\n'.join(lines).rstrip()+'\n','Owner input formatted only; exact original in C0 inputs and hashes')

with (OUT/'CURRENT_DOCUMENT_EDITS.csv').open('w',encoding='utf-8',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(changes[0]));w.writeheader();w.writerows(changes)
print(f'{len(changes)} living/input documents updated; audit conclusions/raw evidence untouched')
