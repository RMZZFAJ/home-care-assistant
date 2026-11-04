# Lotes executáveis da futura Fase D

**D NÃO INICIADA.** Este plano organiza trabalho autorizável, sem conceder
correção, migration, teste mutável, envio ou deploy. A matriz de impacto
associa
as 121 causas e 28 finalidades aos lotes; nenhuma estimativa de semanas/custo ou
percentual de prontidão foi inventada. Nomes de donos são papéis a designar.

## D0 — autorização, ambiente e qualidade dos oráculos

**Entrada:** nova autorização D, HEAD/árvore conferidos, contratos de C e
decisões do ramo escolhido. P04 antes de configurar destino real;
consentimento
e backup antes de recriar dados locais. **Responsáveis:** produto, engenharia,
QA e operador do ambiente. **Saída:** baseline reproduzível e instrumentos que
distinguem resultado correto de incorreto.

Corrigir readiness do helper sem sleeps/timeout cego, predicado SQL que admite
NULL, coleta de incomplete de axe e guardas das ferramentas reutilizáveis.
Oráculo PDF em branco será integrado ao D4, mas seu contrato é fechado aqui.
Não excluir testes nem tratar incomplete como violação automática. Ferramenta
Meta continua impedida até separação inspect/submit e autorização D7;
exportação
Linux não inclui .private/.venv. Remoção de evidência não resolve o risco.

QA mínimo: controles positivos/negativos determinísticos de helper e
predicado,
sentinels em diretório temporário próprio para guardas; sem DB/rede quando a
hipótese é só caminho/saída. Depois, caso navegador afetado pelo runner local
autorizado e CI dos projetos no marco pertinente. **Gate:** oráculo reprova
mutante e aceita controle; CI não aparenta verde por reduzir assertions.
Rollback de harness preserva asserts do produto e histórico dos resultados.

## D1 — bloqueadores e integridade de fronteira

**Depende:** D0; P15 no trecho de revogação em andamento, P01 no campo de
identificação se alterado. **Donos:** engenharia DB/API/UX, QA e gestor de
escala.

1. D1.1: C-CAUSE-049, progresso REQ; filtrar terminal antes do lote, tratar
candidato inválido com diagnóstico e recuperar sem duplicar lembrete.
2. D1.2: C-CAUSE-009, resumo de escala/versão/efeito BAL; impedir proposta
encerrada reabrir ocorrências; preservar designação/autoria e agenda real.
3. D1.3: precisão antes de coerção nas duas fronteiras, NULL/NaN e referência
compensatória; sessão direta perfil/Storage e autoridade após lock conforme
política. Entradas aceitas e recusadas não podem depender do JSON
number/string.
4. D1.4: resumos críticos e retorno de conflito ligados às ações acima, com
foco e leitura móvel/AT, sem reescrever fundação visual inteira.

**Saída:** ambos os P1 corrigidos e regressão discriminante; operações diretas
e HTTP preservam escopo, versão e quantidades. QA:25/100 bloqueadores e
múltiplos
alvos, concorrência independente Auth real, matriz numérica/NULL e nenhuma
mutação em negação. No marco SQL, clean/upgrade legado e integração completos
da cadeia afetada, com backup/consentimento. UX validada em resumo
antes/depois.
Não chamar texto corrigido de solução para starvation. Rollback compatível ou
forward fix incremental; nunca apagar candidaturas históricas para obter
progresso.

## D2 — processos completos e responsabilidade pessoal

**Depende:** D1; P02 para ciência tácita, P06/P07 para transferência simples,
P11 para grupos de revisão e P14 para fechamento inferior. Partes já decididas
podem avançar, mas ramo dependente não é implementado por suposição.
**Donos:** engenharia de domínio, família/recebedores/revisores e produto.

Completar COM inferior e parcelas; ENT recusa/retirada/cancelamento com
consumo,
recebedor pessoal e exceção pós-desligamento; BAL legado/reconto por
substituta
e propostas obsoletas; complemento de consumo; custódia inativa,
apresentações,
duplicatas sem merge destrutivo e escala eficiente/recorrências. REQ preserva
observed/unknown/unfilled e necessidade remanescente. Ciência/acesso têm fatos
separados, regras versionadas e política aprovada.

QA por processo normal/parcial/terminal, duas decisões concorrentes/replay,
revogação e troca de paciente; read-back de documentos/eventos/ledger.
Instalação
limpa/legada e RLS/Auth no marco de schema, sem repetir por edição de
microcopy.
**Saída:** cada pendência tem responsável/caminho terminal, nenhum aceite por
terceiro, consumo ou saldo fictício. Produto/família aceitam os cenários
humanos
de consequência. Rollout por capacidade/paciente conserva eventos antigos.

## D3 — recuperação de edição, listas e experiência

**Depende:** contratos estáveis dos trechos D1/D2; P08/P12 para
retenção/exclusão
de draft; P01 para obrigatoriedade de cadastro. **Donos:** UI/API,
acessibilidade
e representantes dos públicos.

Implementar draft CAS entre aparelhos e intenção recuperável; busca/cursor/
detalhe de pendências antigas; produtor e consumidores de revisão; estados
loading/empty/error/stale/uncertain; foco/reflow e linguagem humana. Consulta
de apresentações, seleção recorrente sem contagem antiga, links de origem e
prévia de convites. Corrigir retorno de etapas já salvas e conflitos.

QA: outro aparelho/dia, duas edições concorrentes, resposta perdida, filtro
com
respostas invertidas,50/100+registros, erro secundário e mudança de contexto.
Teclado/AT e reflow de conteúdo válido; não afirmar conformidade geral por
axe.
**Saída:** pessoa localiza tarefa antiga e recupera edição/resultado sem ajuda
técnica indevida; draft descartado não remove fato oficial. Não criar central
genérica sem benefício demonstrado.

## D4 — arquivos, PDFs e integridade do exemplar

**Depende:** fontes/eventos D2 e recuperação D3; P08/P09/P10/P15 no ramo
afetado.
**Donos:** documentos/Storage, QA, acessibilidade e responsável documental.

Corrigir datas/atores/ressalvas/parcelas/estados/contagem por versão; dividir
célula excessiva; preservar anotações passivas ou recusar perda; recuperar
anexo/avatar; harmonizar limite de transporte; registro final de bytes e
verificador de exemplar. Assinatura técnica incorporada só no ramo P09
aprovado.

QA: mutante PDF sem texto reprova, fatos por tipo/estado extraídos, geometria
e
inspeção visual; assinatura/hash incorretos e QR copiado não passam. Testar
falha em cada etapa de arquivo, cache alterado e original/versão antiga.
Impressão/AT/aparelho com participantes P10. **Saída:** B6-007/008 tratados
nos
caminhos usados; documentos completos/fiéis, alternativa acessível aceita e
nenhum original histórico sobrescrito. Armazenamento/retencão recuperáveis.

## D5 — PWA, avisos internos e Web Push

**Depende:** autoridade D1, eventos/política D2, estado/frescor D3; P10/P13 e
P02 quando integrar ciência. **Donos:** frontend/worker, segurança, operação.

Manifesto/worker público, inscrição própria por aparelho, opt-in, privacidade
em lockscreen, dedup, expiração/revoke, deep links e atualização segura.
Reusar
outbox e pendências internas. Provar envio incerto por etapa e isolamento de
conta/aparelho; não habilitar Meta/e-mail operacional por consequência.

QA com transporte controlado antes de provedor real; rede imprevista
bloqueada.
Homologação autorizada dos aparelhos/serviço real em D6, inclusive app
fechado,
permissão negada, Focus/bateria, mudança de conta e clique sem sessão.
**Saída:**
push não produz ciência/recebimento e falha não perde obrigação interna.
PWA/push são requisitos prioritários aprovados; retirar do primeiro corte
exige
decisão expressa de escopo, não atalho para obter verde.

## D6 — liberação, restore, guias e aceite real

**Depende:** D0–D5 aplicáveis concluídos; P03/P04/P05/P08/P10/P11/P13 fechados
para o corte. **Donos:** responsável pelo produto e operação, engenharia/QA,
participantes reais, dono/substituto de recuperação.

Executar gates completos do mesmo candidato/schema/config, restore isolado em
quarentena, contingência sem duplicar fatos, Auth de confirmação/recuperação
real, impressão/AT/aparelhos e guias com capturas do SHA. Revalidar limites da
plataforma e changelogs pertinentes. Homologar PWA/push efetivamente
prometidos.

**Saída:** decisão GO/NO-GO assinada pelo responsável com escopo, evidências,
riscos residuais, donos e gatilhos de parada. Sem gates ausentes/skipped como
verde. Rollback e retomada de jobs conciliados; promoção/deploy só na
autorização
correspondente. C não executa esse gate nem aprova piloto.

## D7 e D-LATER — canais e ampliações separadamente autorizados

D7: WhatsApp/Meta/Flows, publicação/templates, callbacks, minimização e
identidade
de tentativa; Auth SMS/OAuth só se escolhido; áudio/e-mail operacional exigem
caso e adaptador. Provar inspect separado de submit antes de usar credencial.
Homologação externa não deriva dos 44 pontos B5. Canal desligado precisa ser
inequívoco e alternativa interna operacional aceita.

D-LATER: O17 lote/validade/OCR, O18 visão multipaciente, capacidades próprias
de supervisão/leitura adiadas, otimizações por orçamento e limpeza localizada.
O10 é existente a preservar. Não remover módulos/URLs/integrações em C;
propostas
de limpeza não ganham autorização funcional por aparecerem neste plano.

Em todos os lotes, atualizar docs/current conforme **o que foi implementado e
testado**; não copiar TO_BE como descrição de comportamento já disponível.
