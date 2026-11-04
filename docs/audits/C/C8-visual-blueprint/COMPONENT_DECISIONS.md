# Evoluir ou reconstruir componentes na D

Liberdade de reconstrução foi aprovada; nenhum componente funcional muda na C.
Escolha por consumidor e problema demonstrado, conservando contratos,
permissões, protocolo, autoria, movimentos, URLs e acessibilidade.

<!-- c-table:start -->

- **Consumidor:** Shell/AppWorkspace

  **Escolha planejada:** Evoluir composição ativa e reexport workspace.tsx

  **Ganho a comprovar:** Tarefa/atalho coerentes por perfil, navegação
  completa móvel e retorno seguro

  **Risco e controle:** Não confundir módulo ativo com órfão; regressão de
  contexto/URLs

- **Consumidor:** SupplyDetail COM/ENT/BAL

  **Escolha planejada:** Reconstrução de composição por domínio permitida

  **Ganho a comprovar:** Antes/depois sem JSON, parcelas e próximo responsável
  próprios

  **Risco e controle:** Revisão/submit parciais, versão e idempotência
  explícitos; nenhum quinto documento implícito

- **Consumidor:** REQ wizard

  **Escolha planejada:** Evoluir busca/etapas; reconstruir observação/draft se
  necessário

  **Ganho a comprovar:** Vazio/unknown/zero e recuperação em outra
  aba/aparelho

  **Risco e controle:** API/banco acompanham UI; não copiar contagem antiga

- **Consumidor:** Confirmadores de escala/regras

  **Escolha planejada:** Refazer presenters tipados

  **Ganho a comprovar:** Pessoa explica mudança antes de aprovar

  **Risco e controle:** Kind desconhecido não aprovável; 409 mantém
  intenção/foco

- **Consumidor:** Inbox/consumo/auditoria

  **Escolha planejada:** Evoluir query/cursor/detalhe e estados próprios

  **Ganho a comprovar:** Alvo51/101/201 alcançável; listas atualizam sem
  reload

  **Risco e controle:** Resposta tardia não troca paciente/filtro; falha
  secundária não cria vazio

- **Consumidor:** Documentos/histórico/PDF

  **Escolha planejada:** Evoluir DTO; pipeline de emissão/assinatura próprio

  **Ganho a comprovar:** Exemplar verificável, fatos e autoria completos

  **Risco e controle:** Não trocar bytes antigos; assinatura antes de ready e
  hash externo

- **Consumidor:** Anexos/avatar

  **Escolha planejada:** Evoluir reserva/finalize/recuperação

  **Ganho a comprovar:** Uma intenção não duplica arquivo; abandono conserva
  ready

  **Risco e controle:** Transporte, sanitização, retenção e permissão próprios

- **Consumidor:** Estoque/devolução

  **Escolha planejada:** Nova UI simples com equivalência ENT demonstrada

  **Ganho a comprovar:** Menos redigitação; origem/destino/pessoas/motivo
  claros

  **Risco e controle:** Não retirar UI antes da matriz P07; correção não vira
  transferência

- **Consumidor:** Guia/setup

  **Escolha planejada:** Novo wizard/tour aprovado O01+

  **Ganho a comprovar:** Global prepara; família/equipe reabrem guia

  **Risco e controle:** Setup não dá GO; tour não altera capacidade

- **Consumidor:** Módulos sem consumidor

  **Escolha planejada:** Candidatos de limpeza, nenhuma exclusão em C

  **Ganho a comprovar:** Retirar só duplicação comprovada

  **Risco e controle:** Grafo inclui reexports/demos/assets; /inventarios e
  Noto preservados

<!-- c-table:end -->

Não criar base genérica nova antes de dois consumidores reais demonstrarem
mesma regra. Componente comum pode oferecer label/help/error/dialog/foco;
saldo, assinatura, ciência e recebimento continuam no domínio correto. Reuso
visual não unifica transações semanticamente diferentes.

Medições na D: redigitação para 12 dias em 45; tempo/erros na decisão de
escala; localizar alvo antigo; recuperar edição em dois aparelhos; explicar
efeito de COM/ENT/BAL. Registrar melhoria só após comparar baseline e
candidato com pessoas/tarefas equivalentes. Nenhum ganho foi inventado em C.
