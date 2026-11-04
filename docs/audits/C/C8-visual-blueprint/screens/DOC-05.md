# DOC-05 — Comparar exemplar e assinatura

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Usuário com arquivo e referência. Banco/API revalidam
capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Comparar arquivo, novo controle do verificador. Gatilho:
navegar pela tarefa ou abrir o alvo contextual autorizado. Objetivo: Escolher
PDF, calcular digest/consultar referência; resultado não depende só do QR.

## Composição e sequência

Escolha PDF; progresso; resultados separados de digest, assinatura e
cadeia/confiança; instrução de recuperação.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Indisponível/sem referência não são falso; cadeia desconhecida difere de bytes
adulterados.

## Ações e efeito

Primária: **Verificar este exemplar**. Secundárias: Escolher outro arquivo;
Voltar.

Consequência: Comparação não conserva conteúdo por padrão nem assina de novo.
Mostrar objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-149-01 — Arquivo a verificar**. FILE_PICKER. Ordem 149.1; Para
  comparar exemplar. Máscara/autocomplete: MIME/bytes/limite do transporte;
  não extensão apenas; off. Dependência/validação: Limite explícito; hash sem
  executar conteúdo; não conservar upload por padrão. Ajuda/exemplo:
  “Selecione o arquivo que deseja comparar.”. Erro: Revise arquivo a
  verificar: Limite explícito; hash sem executar conteúdo; não conservar
  upload por padrão..

- **CTRL-152-01 — Resultado da comparação**. TEXT_INPUT. Ordem 152.1; Após
  referência confiável. Máscara/autocomplete: Sem máscara artificial;
  preservar texto e limite do contrato; off. Dependência/validação:
  Coincide/diverge/sem referência/indisponível distintos. Ajuda/exemplo: “Este
  arquivo coincide com a versão emitida registrada.”. Erro: Revise resultado
  da comparação: Coincide/diverge/sem referência/indisponível distintos..

- **CTRL-C7-008 — Assinatura e cadeia de confiança**. READ_ONLY_DESCRIPTION.
  Ordem C7.8; Conforme etapa; leitura de servidor ou escolha explícita; sem
  confirmação material por default. Máscara/autocomplete: Conforme tipo;
  string decimal exata/data local com fuso; identificador opaco só leitura;
  off. Dependência/validação: Íntegra/adulterada,
  confiável/desconhecida/revogada/expirada separados; indisponível é outro
  estado. Ajuda/exemplo: Não equivaler a assinatura pessoal ou fato físico.
  Erro: Revise assinatura e cadeia de confiança. Íntegra/adulterada,
  confiável/desconhecida/revogada/expirada separados; indisponível é outro
  estado.

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-DOC-05` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `docs/verifyPdf`; ausência de exemplo no HTML é declarada, sem novo
mockup equivalente. B1: SC-005.

Critérios C9 relacionados: C-AC-013, C-AC-015, C-AC-023, C-AC-034, C-AC-036,
C-AC-046, C-AC-063, C-AC-071, C-AC-100, C-AC-101, C-AC-102, C-AC-103,
C-AC-104, C-AC-105, C-AC-106, C-AC-107, C-AC-108, C-AC-109, C-AC-110,
C-AC-111, C-AC-119, C-NEW-AC-017, C-NEW-AC-018, C-NEW-AC-019, C-NEW-AC-020,
C-NEW-AC-023, C7-AC-002, C7-AC-011. A associação é por domínio; cada caso
preserva seu discriminante específico e não significa que todos os critérios
foram executados nesta tela. Fonte funcional:
[DOCUMENTS_PDFS_AND_INTEGRITY](../../C3-functional-specification/DOCUMENTS_PDFS_AND_INTEGRITY.md).
