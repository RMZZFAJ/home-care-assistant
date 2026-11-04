# BAL-01 — Organizar contagens por plantão

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Família/admin e designado na consulta. Banco/API revalidam
capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: /balancos, atual a alterar. Gatilho: navegar pela tarefa ou
abrir o alvo contextual autorizado. Objetivo: Ver obrigação, prazo
original/efetivo e responsável; configurar, adiar ou designar.

## Composição e sequência

Obrigação, prazo original/efetivo e responsável; configuração em drawer com
resumo dia/tipo/fuso.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Revisão facultativa no primeiro uso; atraso histórico não desaparece na
regularização.

## Ações e efeito

Primária: **Revisar programação do BAL**. Secundárias: Solicitar adiamento;
Atualizar; Ver histórico.

Consequência: Configurar não faz contagem nem altera prazo por proposta
pendente. Mostrar objeto/quantidade/pessoa/versão antes de qualquer decisão
material. Retorno/Voltar preserva edição e contexto; próximo destino é
resultado do ato ou tarefa pertinente, nunca novo envio automático. Em
resposta incerta consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-043-01 — Habilitar regime**. CHECKBOX_OR_SWITCH. Ordem 43.1; Sim na
  configuração, preserva atual. Máscara/autocomplete: Sem máscara; rótulo
  descreve efeito; vazio não equivale a concordância; off.
  Dependência/validação: Não habilitar por migration. Ajuda/exemplo:
  “Processar BAL por plantão neste paciente.”. Erro: Revise habilitar regime:
  Não habilitar por migration..

- **CTRL-044-01 — Fuso**. SEARCHABLE_TIMEZONE. Ordem 44.1; Sim, sem inferência
  pelo navegador. Máscara/autocomplete: Zona IANA configurada, exemplo
  America/Sao_Paulo; off. Dependência/validação: Fuso válido, weekday 0–6,
  tipo ativo, versão. Ajuda/exemplo: Mostrar prazo local e intervalo com data
  de fim.. Erro: Revise fuso: Fuso válido, weekday 0–6, tipo ativo, versão..

- **CTRL-044-02 — Dia da semana**. RADIO_OR_SELECT. Ordem 44.2; Sim, sem
  inferência pelo navegador. Máscara/autocomplete: Opções finitas com rótulo
  humano; sem opção material preaceita; off. Dependência/validação: Fuso
  válido, weekday 0–6, tipo ativo, versão. Ajuda/exemplo: Mostrar prazo local
  e intervalo com data de fim.. Erro: Revise dia da semana: Fuso válido,
  weekday 0–6, tipo ativo, versão..

- **CTRL-044-03 — Tipo de plantão**. RADIO_OR_SELECT. Ordem 44.3; Sim, sem
  inferência pelo navegador. Máscara/autocomplete: Opções finitas com rótulo
  humano; sem opção material preaceita; off. Dependência/validação: Fuso
  válido, weekday 0–6, tipo ativo, versão. Ajuda/exemplo: Mostrar prazo local
  e intervalo com data de fim.. Erro: Revise tipo de plantão: Fuso válido,
  weekday 0–6, tipo ativo, versão..

- **CTRL-045-01 — Início do regime**. DATE_INPUT. Ordem 45.1; Sim, escolha
  explícita. Máscara/autocomplete: DD/MM/AAAA na apresentação; ISO no
  transporte; não inferir fuso; off. Dependência/validação: Sem gerar contagem
  física retroativa. Ajuda/exemplo: “A partir de 05/11/2026.”. Erro: Revise
  início do regime: Sem gerar contagem física retroativa..

- **CTRL-046-01 — Profissional preferido**. SEARCHABLE_COMBOBOX. Ordem 46.1;
  Não, política atual. Máscara/autocomplete: Busca por nome/alias autorizado;
  seleção por ID; nenhum ID digitado como autorização; off.
  Dependência/validação: Vínculo elegível; não garante presença.
  Ajuda/exemplo: Ambiguidade pede designação, não escolha arbitrária.. Erro:
  Revise profissional preferido: Vínculo elegível; não garante presença..

- **CTRL-050-01 — Atribuição**. READ_ONLY_DESCRIPTION. Ordem 50.1; Sim quando
  regime ativo. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Pessoa, início/fim, assignment e ledger atuais.
  Ajuda/exemplo: Sem expor UUID como instrução.. Erro: Revise atribuição:
  Pessoa, início/fim, assignment e ledger atuais..

- **CTRL-050-02 — Início da janela**. READ_ONLY_DESCRIPTION. Ordem 50.2; Sim
  quando regime ativo. Máscara/autocomplete: SEM_MASCARA;valor do servidor;
  off. Dependência/validação: Pessoa, início/fim, assignment e ledger atuais.
  Ajuda/exemplo: Sem expor UUID como instrução.. Erro: Revise início da
  janela: Pessoa, início/fim, assignment e ledger atuais..

- **CTRL-050-03 — Fim da janela**. READ_ONLY_DESCRIPTION. Ordem 50.3; Sim
  quando regime ativo. Máscara/autocomplete: SEM_MASCARA;valor do servidor;
  off. Dependência/validação: Pessoa, início/fim, assignment e ledger atuais.
  Ajuda/exemplo: Sem expor UUID como instrução.. Erro: Revise fim da janela:
  Pessoa, início/fim, assignment e ledger atuais..

- **CTRL-050-04 — Versão da atribuição**. READ_ONLY_DESCRIPTION. Ordem 50.4;
  Sim quando regime ativo. Máscara/autocomplete: SEM_MASCARA;valor do
  servidor; off. Dependência/validação: Pessoa, início/fim, assignment e
  ledger atuais. Ajuda/exemplo: Sem expor UUID como instrução.. Erro: Revise
  versão da atribuição: Pessoa, início/fim, assignment e ledger atuais..

- **CTRL-055-01 — Motivo da decisão**. TEXTAREA. Ordem 55.1; Sim em
  adiamento/reconto/configuração. Máscara/autocomplete: Sem máscara; contador
  e limite do contrato visíveis; quebra de linha/reflow; off.
  Dependência/validação: 3–1000 caracteres. Ajuda/exemplo: Explicar efeito e
  próxima pessoa.. Erro: Revise motivo da decisão: 3–1000 caracteres..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-BAL-01` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `bal`; ausência de exemplo no HTML é declarada, sem novo mockup
equivalente. B1: SC-015, OVL-013.

Critérios C9 relacionados: C-AC-001, C-AC-008, C-AC-009, C-AC-010, C-AC-015,
C-AC-051, C-AC-054, C-AC-056, C-AC-057, C-AC-074, C-AC-077, C-AC-086,
C-AC-089, C-AC-104, C-NEW-AC-007, C-NEW-AC-011, C-NEW-AC-012, C-NEW-AC-015,
C7-AC-003. A associação é por domínio; cada caso preserva seu discriminante
específico e não significa que todos os critérios foram executados nesta tela.
Fonte funcional: [BAL](../../C3-functional-specification/BAL.md).
