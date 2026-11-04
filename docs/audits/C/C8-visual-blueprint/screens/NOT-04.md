# NOT-04 — Instalar e atualizar aplicativo

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Titular no aparelho. Banco/API revalidam capacidade, alvo
e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Orientação de instalação/atualização, nova. Gatilho: navegar
pela tarefa ou abrir o alvo contextual autorizado. Objetivo: Instrução
conforme capacidade real; atualização sem perder edição.

## Composição e sequência

Guia contextual por capacidade real; instrução de instalação e atualização
preservando edição.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

iPhone instalado/gesto/permissão específicos; não prometer push em qualquer
aba.

## Ações e efeito

Primária: **Ver como instalar**. Secundárias: Agora não; Atualizar após
salvar; Abrir web.

Consequência: Sem suporte mantém app web completo. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

Tela de orientação/consulta sem novo campo de dado. Links/botões têm nome,
alvo e estado próprios; não adicionar formulário sem necessidade.

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-NOT-04` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `SEM_EQUIVALENTE_NO_HTML`; ausência de exemplo no HTML é declarada,
sem novo mockup equivalente. B1: Nova superfície C3, sem equivalente B1.

Critérios C9 relacionados: C-AC-001, C-AC-003, C-AC-014, C-AC-020, C-AC-023,
C-AC-049, C-AC-064, C-AC-073, C-AC-083, C-AC-084, C-AC-086, C-AC-087,
C-AC-088, C-AC-089, C-AC-090, C-AC-091, C-AC-092, C-AC-093, C-AC-094,
C-AC-095, C-AC-096, C-AC-097, C-AC-098, C-AC-099, C-AC-113, C-AC-115,
C-NEW-AC-001, C-NEW-AC-002, C-NEW-AC-003, C-NEW-AC-026, C7-AC-008, C7-AC-012.
A associação é por domínio; cada caso preserva seu discriminante específico e
não significa que todos os critérios foram executados nesta tela. Fonte
funcional:
[PWA_PUSH_AND_NOTIFICATIONS](../../C3-functional-specification/PWA_PUSH_AND_NOTIFICATIONS.md).
