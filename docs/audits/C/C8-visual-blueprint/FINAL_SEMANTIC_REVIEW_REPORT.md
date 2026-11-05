# Revisão semântica C8 — resultados

66 fichas, 262 controles originais, 171 relações originais e os catálogos de
mensagens foram examinados contra C3/decisões/protótipo. Foram corrigidos 58
tipos de componente e 150 propostas de copy B1. Catálogo atual: 274 controles,
424 usos e 6479 linhas de texto, incluindo as 4.205 fontes B1 exatas. Os
números não são oráculo de qualidade; cada correção tem cenário positivo e
contraprova nos casos C-FINAL-AC, sem execução funcional nesta C.

## C8-F01 — EDITABILIDADE_HERDADA

Contexto: REQ-02;COM-02;ENT-03.

Antes: Editor da criação em revisão/consulta.

Correção documental: Modos explícitos; conteúdo emitido/expedido em leitura.

## C8-F02 — PROPOSTA_MUTAVEL_NA_DECISAO

Contexto: ESC-03;ADM-04;BAL-05.

Antes: Fuso/notas/política/alvo editáveis ao decidir.

Correção documental: Proposta congelada; só motivo próprio; versão revista ou
conflito.

## C8-F03 — ETAPAS_MISTURADAS

Contexto: COM-03;COM-04;ENT-05.

Antes: Editar chegada ao validar; dispensa digitada; consumo já confirmado
debitável.

Correção documental: Chegada/decisão separadas; dispensável calculado; consumo
como referência.

## C8-F04 — AUTORIA_ALHEIA

Contexto: BAL-03;CON-03;CON-04.

Antes: Notas/original reutilizados para outro autor.

Correção documental: Original em leitura; parecer/complemento próprios.

## C8-F05 — RESUMO_COMO_INPUT

Contexto: RAS-01;DOC-02;DOC-03;DOC-05;GUI-02.

Antes: Payload/etapa/história/resultado como textarea/input; resumo de
configuração editável.

Correção documental: Resumo, passado e resultado em leitura; configuração abre
subfluxo autorizado por link.

## C8-F06 — TIPO_INADEQUADO

Contexto: ESC-02;CAT-01;CAT-02;CAT-03;ID-02;ID-04;ADM-02;GUI-03;ENT-03;ENT-04.

Antes: 58 tipos de componente inadequados; máscaras antigas de opções/busca
herdadas em texto/grupos.

Correção documental: Inteiros, códigos, arquivo/avatar, linhas e resultados
tipados; apresentação por componente/estado e autocomplete correto.

## C8-F07 — ERRO_DE_CAMPO_IMUTAVEL

Contexto: ALL_66_SCREEN_IDS.

Antes: Revise aplicado a leitura/cálculo.

Correção documental: Erro de seção distinto do input; interno sem
mensagem/foco indevidos.

## C8-F08 — COPY_POR_LINHA

Contexto: B1_4205_ROWS.

Antes: 150 propostas erradas por substituir título/botão/vazio/dado por mesma
frase.

Correção documental: Literal/contexto; presenter dinâmico; copy por estado.

## C8-F09 — RELACAO_ESPURIA

Contexto: OVL-003;OVL-026;OVL-029;OVL-019;SC-030;OVL-013.

Antes: Global/perfil, senha/push, cancelar/ciência, consulta/criação e
variantes BAL.

Correção documental: Duas removidas, cinco corrigidas e duas variantes
adicionadas com rastro.

## C8-F10 — CAMPO_AUSENTE

Contexto: ID-01;ID-02;CAT-02;REQ-03;ENT-01;ADM-03;NOT-02.

Antes: 12 lacunas de login/parecer/ciência/busca/unidade/MFA.

Correção documental: 12 controles próprios com condição, autoridade, validação
e sigilo.

## C8-F11 — COMPOSICAO_MOVEL

Contexto: ENT-03;ENT-04;ESC-01;ADM-01.

Antes: Quantidade cortada, mês reduzido e métricas ocultando tarefa.

Correção documental: Cartões rotulados, intervalo/lista, prioridade e foco
alcançáveis.

## P02-F01 — DECISAO_SUPERADA

Contexto: REQ-03;REQ-04;ADM-03;NOT-02.

Antes: P02 pendente/all ainda sem decisão.

Correção documental: OWNER_APPROVED, ANY e modalidades elegíveis; canais
postergados.

## P02-F02 — GAP_AS_IS_PARA_D

Contexto: ENT-01;REQ-03.

Antes: scienceByDispatch mutável e auth.uid()=created_by no produto.

Correção documental: Especificar invariável por ator efetivo; implementar só
na D.

## P02-F03 — IDENTIDADE_MATERIAL

Contexto: REQ-03;DOC-02;DOC-03.

Antes: Invalidar por versão técnica/PDF e presumir editor.

Correção documental: REQ imutável; conteúdo/evento/emissão separados.

## GATE-F01 — BLOQUEIO_GERAL

Contexto: D0;D1;D4;D5;D6.

Antes: Parâmetros/contratações como veto geral.

Correção documental: Dez gates por ramo, nenhum aprovado pela documentação.

## Confronto adversarial

Revisão não herda edição; proposta não muda ao aprovar. Leitura falha recupera
pela seção/origem. ANY não inventa ciência de todos. SCI-005 não concede
capacidade nem substitui recebimento. Consulta, save, confirmado e incerto têm
mensagens/efeitos próprios. Não mostrar implementação ao usuário. A
implementação será provada na D; P10 e os gates específicos permanecem.
