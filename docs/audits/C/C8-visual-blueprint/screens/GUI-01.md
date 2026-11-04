# GUI-01 — Apresentação e ajuda por perfil

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Família/equipe primeiro; supervisão depois. Banco/API
revalidam capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Guia documental por público, novo conteúdo. Gatilho: navegar
pela tarefa ou abrir o alvo contextual autorizado. Objetivo: Ajudar equipe,
família e supervisão a cumprir tarefa; links às rotas atuais.

## Composição e sequência

Guia curto por tarefa com etapas, texto acessível e capturas reais futuras;
pular/voltar/retomar.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Admin configura primeiro acesso; titular reabre sempre; imagem de protótipo é
referência só.

## Ações e efeito

Primária: **Próximo passo**. Secundárias: Pular agora; Reabrir no perfil; Ler
ajuda.

Consequência: Guia não aprova ato material nem altera capacidade. Mostrar
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
futura: `SHOT-GUI-01` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `setup/onboarding`; ausência de exemplo no HTML é declarada, sem
novo mockup equivalente. B1: SC-036.

Critérios C9 relacionados: C-AC-002, C-AC-003, C-AC-004, C-AC-006, C-AC-007,
C-AC-008, C-AC-040, C-AC-062, C-AC-063, C-AC-112, C-AC-114, C-AC-115,
C-AC-117, C-AC-118, C-AC-119, C-AC-120, C-AC-121, C-NEW-AC-026, C-NEW-AC-027,
C7-AC-002, C7-AC-006, C7-AC-007, C7-AC-008, C7-AC-009. A associação é por
domínio; cada caso preserva seu discriminante específico e não significa que
todos os critérios foram executados nesta tela. Fonte funcional:
[USER_GUIDES_AND_CONTINUITY](../../C3-functional-specification/USER_GUIDES_AND_CONTINUITY.md).
