# REQ — necessidade, observação e ciência

AS_IS: wizard em /fichas/req, detalhe /historico/:id e visualizador
/documentos/:id; src/lib/validation/requisition.ts exige currentStock
numérico;
B1-FORM-001 mostra zero automático, B1-UX-005 limita rascunho à aba.
Atendimento
vem de ENT aceita vinculada, não de compra ou quantidade pedida. O TO_BE
preserva isso e aplica DEC-002/003/012/030 e O11/O16.

## Telas e campos

<!-- c-table:start -->

- **Tela:** REQ-01

  **Rota e situação:** /fichas/req, atual a alterar

  **Objetivo e ações:** Selecionar materiais, extras e urgência; salvar
  rascunho, avançar, voltar.

- **Tela:** REQ-02

  **Rota e situação:** Revisão do wizard, atual a alterar

  **Objetivo e ações:** Conferir paciente, observações e ciência aplicável;
  Emitir requisição.

- **Tela:** REQ-03

  **Rota e situação:** /historico/:id, atual a alterar

  **Objetivo e ações:** Ver linhas, atendimento, ciência, acesso, anexos e
  versões; declarar necessidade remanescente.

- **Tela:** REQ-04

  **Rota e situação:** Diálogo de ciência, novo contrato

  **Objetivo e ações:** Modalidade manual/condicionada; continuar/cancelar com
  consequência explícita.

- **Tela:** REQ-05

  **Rota e situação:** Lista recorrente, novo painel do wizard

  **Objetivo e ações:** Salvar/usar seleção de materiais do paciente, sem
  copiar contagem antiga.

<!-- c-table:end -->

<!-- c-table:start -->

- **Campo:** Paciente

  **Tipo/origem:** Contexto de servidor, somente leitura

  **Obrigatório e default:** Sim, contexto selecionado

  **Validação/unidade:** Revalidar vínculo na emissão

  **Ajuda e exemplo:** “Você está solicitando para Residência Exemplo.”

- **Campo:** Materiais

  **Tipo/origem:** Multi-seleção buscável, catálogo ativo

  **Obrigatório e default:** Ao menos um material ou extra; vazio

  **Validação/unidade:** IDs únicos, até 1000 linhas herdadas; alias busca

  **Ajuda e exemplo:** “Escolha os materiais de que precisa.”

- **Campo:** Estoque observado

  **Tipo/origem:** Decimal por linha, declaração atual

  **Obrigatório e default:** Não, vazio

  **Validação/unidade:** 0–100000, precisão da unidade até seis casas; valor
  original exato

  **Ajuda e exemplo:** “Quanto você contou agora? Ex.: 0 ou 1,5.”

- **Campo:** Não sei informar

  **Tipo/origem:** Checkbox por linha, usuário

  **Obrigatório e default:** Não, desmarcado

  **Validação/unidade:** Exclusivo com valor observado; não altera ledger

  **Ajuda e exemplo:** “Use quando não puder contar.”

- **Campo:** Urgente

  **Tipo/origem:** Checkbox por linha

  **Obrigatório e default:** Sim como boolean, false

  **Validação/unidade:** Não inferir por saldo mínimo

  **Ajuda e exemplo:** “Precisa de atenção mais rápida.”

- **Campo:** Justificativa de repetição

  **Tipo/origem:** Texto, autor

  **Obrigatório e default:** Condicional se necessidade anterior pendente;
  vazio

  **Validação/unidade:** 3–1000 caracteres, preserva vínculo anterior

  **Ajuda e exemplo:** “Ainda precisamos do material após atendimento
  parcial.”

- **Campo:** Item extra

  **Tipo/origem:** Nome textual, autor

  **Obrigatório e default:** Nome se extra adicionado; vazio

  **Validação/unidade:** 1–200 caracteres, até 20 extras, identidade própria

  **Ajuda e exemplo:** “Material não encontrado no catálogo.”

- **Campo:** Observação do extra

  **Tipo/origem:** Mesmo modo de estoque e urgência

  **Obrigatório e default:** Conforme linha extra

  **Validação/unidade:** Zero explícito/unknown/unfilled distintos

  **Ajuda e exemplo:** Não criar produto automaticamente.

- **Campo:** Observações gerais

  **Tipo/origem:** Lista de textos, autor

  **Obrigatório e default:** Não, lista vazia

  **Validação/unidade:** Até 50 entradas de 1–1000 caracteres

  **Ajuda e exemplo:** “Embalagem encontrada aberta”, sem dado clínico
  desnecessário.

- **Campo:** Nome da seleção recorrente

  **Tipo/origem:** Texto do usuário, novo

  **Obrigatório e default:** Se salvar seleção; vazio

  **Validação/unidade:** Proposta: 2–80 caracteres; escopo paciente/usuário

  **Ajuda e exemplo:** “Materiais habituais do turno.”

- **Campo:** Motivo de necessidade remanescente

  **Tipo/origem:** Texto e referência à REQ

  **Obrigatório e default:** Sim ao abrir nova necessidade vinculada

  **Validação/unidade:** 3–1000; sem quantidade solicitada

  **Ajuda e exemplo:** “O material entregue não encerrou a necessidade.”

- **Campo:** Modalidade de ciência

  **Tipo/origem:** Preferência/política por tipo

  **Obrigatório e default:** Conforme P02, sem opt-in tácito implícito

  **Validação/unidade:** Snapshot da regra vigente na emissão

  **Ajuda e exemplo:** “Manual”, “Ao continuar antes de abrir”, “Presumida na
  emissão”.

- **Campo:** Versão e intenção

  **Tipo/origem:** Servidor/chave estável, ocultos

  **Obrigatório e default:** Sim na ação

  **Validação/unidade:** Conflito se conteúdo diverge ou versão muda

  **Ajuda e exemplo:** Não pedir UUID ao usuário.

<!-- c-table:end -->

Estoque TO_BE tem três valores semânticos: `observed` com quantidade
(inclusive
zero), `unknown` por escolha expressa e `unfilled` quando deixado vazio.
Campo vazio não impede por si emitir segundo DEC-003; o PDF diz “Não
informado”.
O desconhecido diz “Não sei informar”; nenhum deles é convertido em 0. O
saldo calculado pode ser mostrado em área autorizada separada, nunca preenche
contagem. Seleção recorrente traz só materiais, não urgência/estoque
anteriores.

## Jornada, transições e responsáveis

<!-- c-table:start -->

- **De → para:** Edição → rascunho durável

  **Ação/ator:** Autor salva/autosave confirmado

  **Efeito e próxima etapa:** Sem protocolo emitido ou saldo; recuperar em
  outro aparelho.

- **De → para:** Rascunho → emitida

  **Ação/ator:** Autor com capacidade revisa e emite

  **Efeito e próxima etapa:** Banco resolve snapshots/protocolo/hash; cria
  pendência e versão; família avalia.

- **De → para:** Ciência pendente → registrada

  **Ação/ator:** Ator elegível, modalidade escolhida

  **Efeito e próxima etapa:** Evento com ator, origem, versão e regra; não
  atende material.

- **De → para:** Emitida → parcialmente/totalmente atendida

  **Ação/ator:** Aceite positivo de ENT vinculada

  **Efeito e próxima etapa:** Nova versão de atendimento por linha, sem
  quantidade pedida ou crédito duplicado.

- **De → para:** Atendida → necessidade remanescente

  **Ação/ator:** Autor autorizado inicia nova REQ ligada

  **Efeito e próxima etapa:** Motivo e relação preservados; nenhum undo do
  fato físico.

- **De → para:** Atendida → arquivada

  **Ação/ator:** Política atual ou admin local em exceção motivada

  **Efeito e próxima etapa:** Ciência pendente exigida conserva exceção e
  arquivamento manual legítimo.

- **De → para:** Arquivada → atendimento revisto

  **Ação/ator:** Cancelamento/compensação legítima de ENT

  **Efeito e próxima etapa:** Evento de reabertura coerente; histórico e
  versão arquivada não somem.

<!-- c-table:end -->

Manual registra ato expresso. Modal condicionado informa **antes de abrir**:
“Continuar registra sua ciência; não declara leitura integral”. Cancelar não
registra ciência e retorna ao ponto anterior. Tácita registra na emissão com
origem `tacit_preference` e versão da preferência. Mudança posterior é
prospectiva.
Acesso efetivo tem evento independente por abertura autorizada; duplicação por
retry técnico não fabrica várias aberturas, mas nova abertura real é
registrada.
Prévia negada ou ciência tácita não cria acesso fictício. P02 define atos
excluídos.

## Erro, concorrência e recuperação

Emitir congela conteúdo/chave; resposta perdida consulta a mesma tentativa.
Se persistiu, abrir documento e informar registro salvo; se não confirmado,
manter uncertain. Não enviar novamente com chave nova. Campo inválido leva ao
campo exato; trocar paciente conserva rascunho no escopo original e exige
contexto atual antes de concluir. Mudança de catálogo/política/versão
apresenta
diferença na retomada. Revogado não emite nem declara ciência nova.

P1 C-CAUSE-049 exige seleção automática com progresso entre pacientes e entre
documentos do mesmo paciente, terminais fora do lote elegível e dedup de cada
lembrete. Dado legado inválido deve gerar diagnóstico/continuidade segura,
sem limpar história ou inventar prazo. A ciência, o atendimento e o deadline
não podem depender do êxito de WhatsApp/push.

## Documento, privacidade e aceite

PDF inclui observação com modo e instante da emissão, urgência, estado por
linha, ciência com origem, vínculos e ressalvas. Nunca imprime “solicitado:
0”.
A equipe continua sem acesso ao estoque familiar geral. Pendência interna
aponta
para documento e responsável, sem provar leitura ou recebimento.

Aceites D: escolher material/apagar 7 conserva unfilled; digitar 0 conserva
observed=0; escolher desconhecido produz unknown; reabrir em outro aparelho
mantém distinções. Emitir sob resposta perdida cria uma REQ. ENT parcial
ligada
a duas REQs credita só uma vez e permite nova necessidade motivada. Ciência
nas três modalidades tem texto/ator/origem corretos; nenhum usuário sem
capacidade a registra. Família/profissional explicam cada diferença por
teclado,
AT e celular real. Matrizes C-AC-025/032/036/041/049 e CAPs complementam.
