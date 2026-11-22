# Modelo Integral — primeira migração compartilhada

Base25d1b70. A nova [ordem visual](../../../ui-ux/CANONICAL_MODEL.md) está
incorporada à D-B, substituindo Fluent UI. O HTML original foi preservado;
guias ativos indicam a nova precedência, sem reescrever auditorias históricas.
[Registro adicional](UI_MODEL_ACCEPTANCE.csv),
[consumidores](UI_COMPONENT_MIGRATION.csv), [provas](UI_MODEL_STAGE_1.json) e
[observação do pai/remoto](UI_MODEL_BASE_OBSERVATION.json).

## Implementação

Ícones próprios usam os caminhos do HTML; ícones adicionais seguem os mesmos
traços. A dependência direta de ícones Fluent foi removida. Badges e etapas
agora são nativos. Modais, painéis de edição e menu lateral móvel compartilham
overlays Base UI sem tema, com foco, Escape, bloqueio de fechamento e camadas.
RecordDrawer conserva formulário montado, descarte, recuperação e destino de
foco legítimo. Não há adaptador da API Fluent.

canonical-ui.css implementa os primeiros tokens e componentes do modelo.
A migração integral continua pendente:56 consumidores ainda importam Fluent,
incluindo provider, formulários, menus e shell. O ledger identifica cada um.
Não há aprovação de aparência misturada ou declaração de paridade global.
Abas e Andamentos persistidos continuam por implementar.

## Provas e contraprovas

Doze casos de produção locais passaram:seis de edição/consulta, dois de
comparação canônica e quatro de REQ/COM, nos projetos Chromium e iOS.
Modal comparado diretamente ao HTML em320/390/768/1024/1440 nos dois motores:
cores, bordas e raios;20 imagens, dez scans Axe, teclado, forced-colors,
movimento reduzido, Escape e retorno de foco. A prova vale para o componente,
não para a aparência de todas as telas nem aparelho físico.

REQ preserva extra/observação inválida, foco, correção e emissão única. COM
preserva versão, parcela, intenção perdida/recuperada, bloqueio de fechamento,
ledger e PDFs distintos dos dois fatos. O seletor visual de badge passou a
usar texto acessível; as asserções de geometria/estado/efeitos foram mantidas.

Uma regressão real foi encontrada:CSS antigo deixava fundo azul sob texto
verde da etapa atual, contraste1.11. Seis regras legadas foram removidas;
REQ/COM passaram4/4 na repetição, sem excluir a regra Axe. A prova canônica
também corrigiu duas premissas do instrumento:focus-visible exige teclado e
janela ativa; o drawer móvel foi testado em outra conta global, pois o perfil
profissional usa navegação inferior. As falhas anteriores permanecem por hash.
Tipos e lint dirigidos passaram. CI completa continua gate do novo SHA.

## Limites e sequência

SQL local/remoto164, última20261109024515, digest ordenado coincidente e zero
pendências; nenhuma migration nova para aplicar antes do commit. CI25d1b70
aprovou Windows/Ubuntu/banco; browsers estavam em andamento na observação.
Isso não aprova esta mudança. PR7 Draft, sem merge/produção/ativação externa;
Sonar adiado pelo responsável. PDFs técnicos e contratos de segurança preservados.

C033 passou a PARTIAL apenas pelo início da comparação canônica; matriz
original56 PASS/49 PARTIAL/0 NOT_STARTED, primeiras30 colunas preservadas.
O escopo UI adicional possui18 requisitos próprios e não recebe aprovação
integral. Próximos lotes:migrar controles/shell, fichas em abas e Andamentos
reais, recursos ausentes do HTML,66 composições/171 relações e validação final.
