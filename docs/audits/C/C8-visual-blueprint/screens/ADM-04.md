# ADM-04 — Decidir proposta administrativa

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Outra identidade local competente. Banco/API revalidam
capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Diálogo de proposta/override, atual a alterar. Gatilho:
navegar pela tarefa ou abrir o alvo contextual autorizado. Objetivo:
Antes/depois humano, objeto/pessoa, consequência, versão e aprovação distinta.

## Composição e sequência

Diálogo objeto/pessoa/antes/depois/alcance; motivo; fallback desconhecido não
aprovável.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

409 conserva diálogo e intenção; nunca JSON necessário para decisão.

## Ações e efeito

Primária: **Aprovar proposta exibida**. Secundárias: Rejeitar com motivo;
Voltar.

Consequência: Mesmo ID/versão exibidos, sem autoaprovação por troca de perfil.
Mostrar objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-160-01 — Proposta**. READ_ONLY_DESCRIPTION. Ordem 160.1; Sim ao
  decidir. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Kind conhecido traduzido; desconhecido não aprovável.
  Ajuda/exemplo: Valores atuais/propostos lado a lado.. Erro: Revise proposta:
  Kind conhecido traduzido; desconhecido não aprovável..

- **CTRL-160-02 — Versão da proposta**. READ_ONLY_DESCRIPTION. Ordem 160.2;
  Sim ao decidir. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Kind conhecido traduzido; desconhecido não aprovável.
  Ajuda/exemplo: Valores atuais/propostos lado a lado.. Erro: Revise versão da
  proposta: Kind conhecido traduzido; desconhecido não aprovável..

- **CTRL-161-01 — Motivo da alteração/decisão**. TEXTAREA. Ordem 161.1; Quando
  ação crítica. Máscara/autocomplete: Sem máscara; contador e limite do
  contrato visíveis; quebra de linha/reflow; off. Dependência/validação:
  3–1000 onde contrato herdado. Ajuda/exemplo: “Por que esta permissão precisa
  mudar?”. Erro: Revise motivo da alteração/decisão: 3–1000 onde contrato
  herdado..

- **CTRL-162-01 — Capacidade proposta**. SEARCHABLE_COMBOBOX. Ordem 162.1;
  Conforme kind. Máscara/autocomplete: Busca por nome/alias autorizado;
  seleção por ID; nenhum ID digitado como autorização; off.
  Dependência/validação: Alvo local, segunda identidade, versão da política.
  Ajuda/exemplo: Nunca pedir ao usuário ler JSON para aprovar.. Erro: Revise
  capacidade proposta: Alvo local, segunda identidade, versão da política..

- **CTRL-162-02 — Política proposta**. SEARCHABLE_COMBOBOX. Ordem 162.2;
  Conforme kind. Máscara/autocomplete: Busca por nome/alias autorizado;
  seleção por ID; nenhum ID digitado como autorização; off.
  Dependência/validação: Alvo local, segunda identidade, versão da política.
  Ajuda/exemplo: Nunca pedir ao usuário ler JSON para aprovar.. Erro: Revise
  política proposta: Alvo local, segunda identidade, versão da política..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-ADM-04` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `SEM_EQUIVALENTE_NO_HTML`; ausência de exemplo no HTML é declarada,
sem novo mockup equivalente. B1: SC-032, OVL-004, OVL-006, OVL-009.

Critérios C9 relacionados: C-AC-005, C-AC-011, C-AC-013, C-AC-014, C-AC-016,
C-AC-018, C-AC-019, C-AC-020, C-AC-024, C-AC-026, C-AC-033, C-AC-037,
C-AC-038, C-AC-059, C-AC-060, C-AC-061, C-AC-071, C-AC-075, C-AC-078,
C-AC-079, C-AC-085, C-AC-095, C-AC-099, C-AC-121, C-NEW-AC-015, C-NEW-AC-016,
C7-AC-005, C7-AC-006. A associação é por domínio; cada caso preserva seu
discriminante específico e não significa que todos os critérios foram
executados nesta tela. Fonte funcional:
[ADMINISTRATIVE_OPERATIONS](../../C3-functional-specification/ADMINISTRATIVE_OPERATIONS.md).
