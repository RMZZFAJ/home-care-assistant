# Especificação visual por tarefa e estado

Direção HTML/oito PNG aprovada, sem protótipo equivalente recriado.
Especificação TO_BE; **D NÃO INICIADA**.

66 fichas, 262 controles originais e 171 relações originais revistos. Catálogo
atual: 274 controles, 424 usos contextuais, 171 relações reconciliadas.

## Precedência dos contratos

Ficha define finalidade/ator/estado e os 24 pontos. Catálogo define identidade
do controle; CONTROL_SCREEN_CONTRACTS resolve cada screen_id/control_id: modo,
componente, condição, autoridade, default, validação, mensagem e foco.
EDITABLE_SUBFORM só é editável no estado/ator indicado; fora dele é leitura ou
oculto conforme a condição. Nunca herdar editor de criação na aprovação.
READ_ONLY/CALCULATED/AUTO_FILLED são texto, não input disabled;
INTERNAL/HIDDEN não entram no foco ou texto acessível.

## Identidade aprovada e composição

Teal #146c78, texto #19333d e papel #f4f7f8; superfícies claras/bordas suaves,
radius próximo de 14px e agrupamento 16–24px orientam o estilo. Desktop tem
navegação/contexto persistentes; tarefa/consequência antes de ajuda
secundária. Tipografia/contraste/reflow precisam de prova no candidato, sem
reproduzir texto decorativo minúsculo como requisito acessível.

Móvel segue a tarefa em uma coluna, com quantidades/unidades/ações
alcançáveis. ENT usa cartões e não copia tabela que corta quantidade no
exemplo móvel. ADM prioriza tarefas antes de pilha de métricas; Mês preserva
intervalo/lista. Barra inferior/ações fixas não cobrem conteúdo, teclado ou
foco.

## Mensagens e estados

Leitura falha atualiza seção; escrita incerta consulta mesma intenção;
confirmado não regride; parcial identifica etapas reais. Vazio só depois de
consulta válida. READ_ERROR não é FIELD_ERROR; output não pede Revise campo.
Diálogo só para decisão/consentimento/descarte pertinentes.

Catálogo mantém 4.205 fontes B1 exatas como histórico. Não são automaticamente
copy futura. Substituição usa literal/contexto, nunca toda string na mesma
linha. Expressão dinâmica usa presenter tipado; novas mensagens têm condição
por tarefa/estado. Placeholders não expõem códigos/chaves e só usam fatos
confirmados.

## Fichas revistas

- [REQ-01 — Selecionar materiais](screens/REQ-01.md).

- [REQ-02 — Revisar requisição](screens/REQ-02.md).

- [REQ-03 — Consultar requisição](screens/REQ-03.md).

- [REQ-04 — Declarar ciência](screens/REQ-04.md).

- [REQ-05 — Usar lista frequente](screens/REQ-05.md).

- [COM-01 — Solicitar aquisição](screens/COM-01.md).

- [COM-02 — Acompanhar aquisição](screens/COM-02.md).

- [COM-03 — Conferir parcela recebida](screens/COM-03.md).

- [COM-04 — Encerrar expectativa remanescente](screens/COM-04.md).

- [ENT-01 — Preparar entrega](screens/ENT-01.md).

- [ENT-02 — Minhas tarefas de entrega](screens/ENT-02.md).

- [ENT-03 — Conferir entrega pessoalmente](screens/ENT-03.md).

- [ENT-04 — Informar divergência](screens/ENT-04.md).

- [ENT-05 — Resolver pedido de cancelamento](screens/ENT-05.md).

- [ENT-06 — Encaminhar exceção e sucessão](screens/ENT-06.md).

- [BAL-01 — Organizar contagens por plantão](screens/BAL-01.md).

- [BAL-02 — Contar materiais](screens/BAL-02.md).

- [BAL-03 — Consultar ou iniciar revisão](screens/BAL-03.md).

- [BAL-04 — Designar substituta para reconto](screens/BAL-04.md).

- [BAL-05 — Decidir adiamento](screens/BAL-05.md).

- [ESC-01 — Consultar escala](screens/ESC-01.md).

- [ESC-02 — Preparar série de plantões](screens/ESC-02.md).

- [ESC-03 — Decidir alteração de plantão](screens/ESC-03.md).

- [ESC-04 — Alterar ocorrência ou série](screens/ESC-04.md).

- [EST-01 — Consultar estoques](screens/EST-01.md).

- [EST-02 — Registrar movimento familiar](screens/EST-02.md).

- [EST-03 — Consultar origem de movimento](screens/EST-03.md).

- [EST-04 — Transferir ou devolver material](screens/EST-04.md).

- [CAT-01 — Gerir catálogo local](screens/CAT-01.md).

- [CAT-02 — Consultar unidades e precisão](screens/CAT-02.md).

- [CAT-03 — Gerir apresentações](screens/CAT-03.md).

- [CAT-04 — Tratar possível duplicata](screens/CAT-04.md).

- [CAT-05 — Selecionar e conferir apresentação](screens/CAT-05.md).

- [CON-01 — Consultar relatos e pendências](screens/CON-01.md).

- [CON-02 — Registrar informação operacional](screens/CON-02.md).

- [CON-03 — Complementar relato](screens/CON-03.md).

- [CON-04 — Decidir consumo](screens/CON-04.md).

- [ID-01 — Entrar e recuperar conta](screens/ID-01.md).

- [ID-02 — Meu perfil e preferências](screens/ID-02.md).

- [ID-03 — Aceitar vínculo com segurança](screens/ID-03.md).

- [ID-04 — Gerir profissionais e vínculos](screens/ID-04.md).

- [ID-05 — Selecionar contexto e lidar com acesso alterado](screens/ID-05.md).

- [ARQ-01 — Anexar prova autorizada](screens/ARQ-01.md).

- [ARQ-02 — Recuperar ou abandonar envio](screens/ARQ-02.md).

- [RAS-01 — Continuar edição privada](screens/RAS-01.md).

- [RAS-02 — Comparar edições concorrentes](screens/RAS-02.md).

- [NOT-01 — Consultar avisos e tarefas](screens/NOT-01.md).

- [NOT-02 — Preferências e aparelhos](screens/NOT-02.md).

- [NOT-03 — Definir regras de avisos](screens/NOT-03.md).

- [NOT-04 — Instalar e atualizar aplicativo](screens/NOT-04.md).

- [NOT-05 — Conciliar falha técnica](screens/NOT-05.md).

- [DOC-01 — Localizar documento e versão](screens/DOC-01.md).

- [DOC-02 — Entender história do documento](screens/DOC-02.md).

- [DOC-03 — Baixar ou emitir exemplar](screens/DOC-03.md).

- [DOC-04 — Consultar referência mínima](screens/DOC-04.md).

- [DOC-05 — Comparar exemplar e assinatura](screens/DOC-05.md).

- [ADM-01 — Ver próximas tarefas](screens/ADM-01.md).

- [ADM-02 — Administrar recursos autorizados](screens/ADM-02.md).

- [ADM-03 — Comparar configuração atual e proposta](screens/ADM-03.md).

- [ADM-04 — Decidir proposta administrativa](screens/ADM-04.md).

- [ADM-05 — Auditar e encaminhar incidente](screens/ADM-05.md).

- [ADM-06 — Mais ações e retorno seguro](screens/ADM-06.md).

- [GUI-01 — Apresentação e ajuda por perfil](screens/GUI-01.md).

- [GUI-02 — Preparar nova residência](screens/GUI-02.md).

- [GUI-03 — Regularizar contingência](screens/GUI-03.md).

- [GUI-04 — Recuperar serviço com segurança](screens/GUI-04.md).

## Evidência e limites

[24 dimensões](SCREEN_SEMANTIC_REVIEW.csv),
[controles](CONTROL_SEMANTIC_REVIEW.csv),
[relações](SURFACE_RELATION_SEMANTIC_REVIEW.csv) e
[fontes de texto](MICROCOPY_SEMANTIC_REVIEW.csv). Revisão semântica e inspeção
de referências não são implementação, aceite humano, WCAG certificada ou
homologação física; P10 permanece D6.
