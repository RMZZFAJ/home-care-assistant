# DOC-04 — Consultar referência mínima

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Consulta pública mínima por referência opaca; detalhe privado exige
autenticação e autorização.

Finalidade: Consultar referência mínima.

Visitante só recebe referência mínima e limites do resultado; nenhum paciente,
material, nome pessoal ou ID privado enumerável.

AS_IS/rota: /verificar/:id, atual a ampliar.

## 4–14. Campos, modos de interação e validação

Identidade pública da emissão, quando permitida, e resultado.
Protocolo/paciente privados ficam ocultos; não há edição do registro
confiável.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-143-01 — Documento

**Modo/componente:** HIDDEN / NO_USER_CONTROL.

**Quando/ator:** Documento/paciente privado não integra consulta pública
mínima.

**Obrigatoriedade/inicial:** Não renderizar controle.

**Máscara/apresentação:** NÃO APLICÁVEL. Autocomplete: NÃO APLICÁVEL.

**Validação:** Somente contrato interno, com validação no servidor; não expor
segredo/UUID como decisão do usuário.

**Ajuda/exemplo:** Protocolo físico importado tem origem própria.

**Acessibilidade:** Não inserir campo escondido na ordem de foco, texto
acessível ou mensagem para o usuário comum.

### CTRL-143-02 — Tipo

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Consulta do valor de origem; mudanças só no processo
legitimamente responsável.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Consulta do valor de
origem; mudanças só no processo legitimamente responsável.

**Ajuda/exemplo:** Informação do registro indicado, somente para consulta
nesta etapa. Ausência de dado histórico permanece explicitamente identificada.

**Mensagem e condição:** “Não foi possível carregar a informação “Tipo”.
Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-143-03 — Protocolo

**Modo/componente:** HIDDEN / NO_USER_CONTROL.

**Quando/ator:** Protocolo privado não é publicado como mecanismo de
enumeração.

**Obrigatoriedade/inicial:** Não renderizar controle.

**Máscara/apresentação:** NÃO APLICÁVEL. Autocomplete: NÃO APLICÁVEL.

**Validação:** Somente contrato interno, com validação no servidor; não expor
segredo/UUID como decisão do usuário.

**Ajuda/exemplo:** Protocolo físico importado tem origem própria.

**Acessibilidade:** Não inserir campo escondido na ordem de foco, texto
acessível ou mensagem para o usuário comum.

### CTRL-144-01 — Versão da ficha

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Consulta do valor de origem; mudanças só no processo
legitimamente responsável.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Consulta do valor de
origem; mudanças só no processo legitimamente responsável.

**Ajuda/exemplo:** Informação do registro indicado, somente para consulta
nesta etapa. Ausência de dado histórico permanece explicitamente identificada.

**Mensagem e condição:** “Não foi possível carregar a informação “Versão da
ficha”. Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-144-02 — Revisão do renderizador

**Modo/componente:** INTERNAL / NO_USER_CONTROL.

**Quando/ator:** Revisão de renderizador só em detalhe técnico autorizado; sem
implementação na jornada pública comum.

**Obrigatoriedade/inicial:** Não renderizar controle.

**Máscara/apresentação:** NÃO APLICÁVEL. Autocomplete: NÃO APLICÁVEL.

**Validação:** Somente contrato interno, com validação no servidor; não expor
segredo/UUID como decisão do usuário.

**Ajuda/exemplo:** “Versão 3, representação PDF rX.”

**Acessibilidade:** Não inserir campo escondido na ordem de foco, texto
acessível ou mensagem para o usuário comum.

### CTRL-150-01 — Hash canônico

**Modo/componente:** HIDDEN / NO_USER_CONTROL.

**Quando/ator:** Hash lógico privado não deve revelar dados nem substituir
comparação de exemplar.

**Obrigatoriedade/inicial:** Não renderizar controle.

**Máscara/apresentação:** NÃO APLICÁVEL. Autocomplete: NÃO APLICÁVEL.

**Validação:** Somente contrato interno, com validação no servidor; não expor
segredo/UUID como decisão do usuário.

**Ajuda/exemplo:** Não usar esse hash como digest do arquivo.

**Acessibilidade:** Não inserir campo escondido na ordem de foco, texto
acessível ou mensagem para o usuário comum.

### CTRL-151-01 — Hash dos bytes finais

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Consulta do valor de origem; mudanças só no processo
legitimamente responsável.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Consulta do valor de
origem; mudanças só no processo legitimamente responsável.

**Ajuda/exemplo:** Informação do registro indicado, somente para consulta
nesta etapa. Ausência de dado histórico permanece explicitamente identificada.

**Mensagem e condição:** “Não foi possível carregar a informação “Hash dos
bytes finais”. Atualize esta seção. O dado registrado não pode ser alterado
aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-C7-005 — Identificador da emissão

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Consulta do valor de origem; mudanças só no processo
legitimamente responsável.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Consulta do valor de
origem; mudanças só no processo legitimamente responsável.

**Ajuda/exemplo:** Informação do registro indicado, somente para consulta
nesta etapa. Ausência de dado histórico permanece explicitamente identificada.

**Mensagem e condição:** “Não foi possível carregar a informação
“Identificador da emissão”. Atualize esta seção. O dado registrado não pode
ser alterado aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

## 15–18. Hierarquia, ações, consequências e mensagens

Referência mínima → explicação do limite do QR → comparar exemplar →
resultado; entrar para detalhe autorizado é alternativa explícita.

Referência mínima, escolha de exemplar e resultados separados de
bytes/assinatura/confiança; limites em texto junto ao resultado.

Primária: **Comparar meu arquivo**. Secundárias: Entender resultado; Entrar
para detalhe autorizado.

Efeito: QR localiza registro, não prova bytes do arquivo apresentado.

Sucesso/resultado: “Referência localizada. Para verificar os bytes do seu
exemplar, selecione o arquivo na comparação.”

Vazio/inelegível: “Não foi possível localizar uma referência verificável.
Isso, isoladamente, não prova falsidade do arquivo.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Indisponibilidade do serviço não é arquivo adulterado. QR copiado só localiza
registro; comparação de bytes precisa do exemplar apresentado.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Uma coluna; nomes de arquivo quebram linha; instruções e resultados não
dependem de QR/cor/hover.

Resultado calculado anunciado como status e headings; sem input de confiança,
execução do PDF ou detalhes privados no nome acessível.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: docs/verifyPdf. Sem captura real ou aceite humano de
interface futura nesta C.

RECONSTRUIR minimização pública e textos de confiança; não reaproveitar
detalhe privado como página pública.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-013;C-AC-015;C-AC-023;C-AC-034;C-AC-036;C-AC-046;C-AC-063;C-AC-071;C-AC-100;C-AC-101;C-AC-102;C-AC-103;C-AC-104;C-AC-105;C-AC-106;C-AC-107;C-AC-108;C-AC-109;C-AC-110;C-AC-111;C-AC-119;C-NEW-AC-017;C-NEW-AC-018;C-NEW-AC-019;C-NEW-AC-020;C-NEW-AC-023;C7-AC-002;C7-AC-011;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-018.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
