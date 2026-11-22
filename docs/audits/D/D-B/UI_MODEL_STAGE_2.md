# Modelo Integral — controles nativos e feedback

Base 94f36eb. Migração de 49 consumidores para botões, campos, selects, checkboxes,
textareas, badges, indicadores de espera e tabelas próprios. Avisos e barras de
progresso também migrados. A API usa props/eventos HTML; não reproduz a API
Fluent. Callbacks capturam o valor antes de executar atualizações de estado
adiadas. Labels, ajuda, required e erros são associados ao controle real.

As constantes de controle e Notice passam a usar a fundação canônica, alcançando
também formulários operacionais já nativos. Seis regras antigas de tabela foram
retiradas. Valores, textos, campos, FormData, autorização e operações mantidos.
Busca/múltipla seleção, menus, tooltips e provider ainda têm 17 consumidores
Fluent; não são declarados migrados por este lote.

[Evidência](UI_MODEL_STAGE_2.json), [consumidores](UI_COMPONENT_MIGRATION.csv),
[registro UI](UI_MODEL_ACCEPTANCE.csv) e
[ordem visual](../../../ui-ux/CANONICAL_MODEL.md).

## Validação e contraprova

20 cenários distintos passaram em Chromium/iOS. Três resultados iniciais do
mesmo código de produto foram mantidos; os 17 restantes executados após corrigir
o enquadramento visual da prova de governança. Incluem administração, BAL,
REQ/COM e PDFs, cinco propostas em leitura, notificações, edição/descarte/foco,
escala, catálogo/unidade/barcode, limites numéricos e senha/OTP com Auth local.
Proteções de trace/screenshot do teste de MFA mantidas.

Axe detectou “Limpar filtros de propostas” parcialmente visível sob o cabeçalho
após abrir comparações e redimensionar, não sobreposição dos controles do
cabeçalho. Geometria/hit-test confirmaram a distinção. A prova agora parte da
mesma origem de consulta em cada largura; mantém todas as regras Axe, larguras
e asserções funcionais. Diagnóstico adicional só roda se target-size falhar e
não captura valores privados. Contraprova e medições preservadas por hash.

Tipos e lint dirigidos passaram. A suíte completa pertence à CI do novo SHA;
não foi duplicada localmente. Nenhuma mudança de API/RPC, autorização, schema,
assinatura ou worker; não houve transporte externo ou replay offline.

## Estado restante

Matriz 105x39 permanece 56 PASS/49 PARTIAL, primeiras 30 colunas preservadas.
UI adicional continua parcial: 17 arquivos Fluent, shell e estilos globais,
seletores compostos/menus, fichas em abas e Andamentos persistidos, paridade
integral de recursos e comparação completa ao modelo seguem pendentes.
Lote nativo aprovado localmente não aprova toda a aparência.

Local/remoto 164, última 20261109024515, mesmo digest e zero migrations pendentes.
Sem SQL novo, reset, fixture/Auth remoto ou backup redundante. CI 94f36eb aprovou
Windows/Ubuntu/banco; browsers ainda em andamento na observação. PR7 Draft,
produção NO-GO, Sonar adiado, D-C/D6 e gates humanos/físicos/externos separados.
