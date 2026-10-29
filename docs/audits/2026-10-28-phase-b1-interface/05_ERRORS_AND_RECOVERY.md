# B1.4 — Erros e recuperação humana

O adaptador de API já protege dados privados: emite código seguro e correlação,
sem registrar payload. O cliente apresenta mensagem e referência. Contudo,
o `recommendedAction` emitido pelo servidor não é consumido pelo adaptador
genérico; o caminho de recuperação depende de cada tela.

## Catálogos conciliados

[05_ERROR_CATALOG.csv](05_ERROR_CATALOG.csv) relaciona todos os códigos de
`error-catalog.ts` , cada construção `new ApiError` encontrada em `src` , ramos
`setError` da UI e cenários gerados por navegador/cliente/validador. Não se
infere resultado de transação só pelo HTTP. As expressões são preservadas
quando a mensagem depende de Auth, API ou estado.

[ERROR_SOURCE_BRANCHES.csv](evidence/ERROR_SOURCE_BRANCHES.csv) localiza
origens; [ERROR_SURFACES.csv](evidence/ERROR_SURFACES.csv) relaciona telas e
overlays; [ERROR_INJECTION_MATRIX.csv](evidence/ERROR_INJECTION_MATRIX.csv)
separa provas e tentativas incompletas. Nenhum código × tela não exercitado
foi marcado como aprovado. A leitura dirigida de API não pretende auditar
novamente todo o banco.

## Provas atuais

- **Cenário:** Consumo GET401/403/404/409/422/429/500 injetados; **Resultado e
certeza:** Alerta com referência; Nenhum relato registrado continua visível;
**Recuperação necessária:** Não afirmar vazio; CTA por sessão/acesso/consulta.
- **Cenário:** JSON inválido no GET; **Resultado e certeza:** Mensagem de
resposta inválida; não existe comando a recuperar; **Recuperação necessária:**
Atualizar consulta, sem falar em tentativa de gravação.
- **Cenário:** Rede abortada só no GET; **Resultado e certeza:** Cliente pede
recuperar mesma tentativa; **Recuperação necessária:** Distinguir consulta de
envio; dados não foram escritos.
- **Cenário:** Perfil GET500 injetado; **Resultado e certeza:** Alerta e
Carregando perfil… simultâneos; **Recuperação necessária:** Encerrar loading e
oferecer Consultar perfil novamente.
- **Cenário:** Permissão crítica POST409 injetado; **Resultado e certeza:**
Diálogo fecha; alerta aparece fora da decisão; **Recuperação necessária:**
Manter contexto e seleção, mostrar conflito e revisar antes/depois.
- **Cenário:** Observação REQ1001 caracteres, POST real; **Resultado e
certeza:** HTTP400 VALIDATION_ERROR: Too big: expected string to have <=1000
characters; **Recuperação necessária:** Traduzir/localizar campo; validador
rejeitou antes de RPC; nada emitido.
- **Cenário:** Anexo, primeira tentativa; **Resultado e certeza:** HTTP400 no
servidor, resposta abortada; lista vazia; **Recuperação necessária:** Esta
tentativa não comprova gravação; preservada como prova incompleta.
- **Cenário:** Anexo com MIME explícito, segunda prova; **Resultado e certeza:**
HTTP201 antes do aborto; GET posterior mostra arquivo ready328 bytes; input
continua habilitado e texto Failed to fetch; **Recuperação necessária:**
Congelar arquivo/chave, dizer resultado desconhecido, recuperar confirmação.

A última prova usa somente PNG sintético. Nenhum arquivo diferente foi enviado
na mesma tentativa, e nenhuma sobrescrita foi demonstrada. O backend compara
hash e usa `upsert:false` . O defeito é a experiência de incerteza e
mutabilidade
da intenção no cliente, não perda de proteção de integridade.

As quatro falhas de seletor da primeira rodada foram conflitos com o alert
invisível do anunciador do Next. A repetição limita a busca ao main; cinco
cenários suplementares concluíram. Isso é correção do reprodutor documental.
As três folhas de erros e o original completo do anexo foram abertos; a
captura de anexo inclui refresh documental em curso, não um estado READY.

## Modelo de certeza para futura correção

- **Certeza:** Não gravado, rejeição comprovada antes da mutação; **Mensagem
proposta:** Revise [campo]. Nada foi registrado nesta tentativa.; **Ação
segura:** Focar campo e preservar os outros valores.
- **Certeza:** Gravado, comprovante pendente; **Mensagem proposta:** A ficha foi
registrada. Ainda não foi possível abrir o comprovante.; **Ação segura:**
Abrir histórico ou recuperar mesma tentativa.
- **Certeza:** Processando, confirmado pelo servidor; **Mensagem proposta:** A
operação continua em processamento. Consulte o andamento.; **Ação segura:**
Consulta com referência; impedir novo comando equivalente.
- **Certeza:** Desconhecido após transporte; **Mensagem proposta:** Não foi
possível confirmar o resultado. Preserve estes dados e recupere a tentativa.;
**Ação segura:** Reconsultar chave/objeto antes de permitir nova intenção.
- **Certeza:** Leitura indisponível; **Mensagem proposta:** Não foi possível
atualizar esta consulta. [Dados anteriores de hora X, se existirem.]; **Ação
segura:** Atualizar consulta; nenhum envio a recuperar.

O fallback de JSON inválido hoje diz Tente novamente tanto para leitura como
para mutação. Resposta inválida depois de um commit exige a mesma cautela de
resposta perdida. O código de idempotência em conflito recomenda nova operação,
mas a pessoa deve primeiro conhecer o resultado original. Não trocar chave
automaticamente para silenciar conflito.

## Tratamento por domínio e localização

Formulários devem associar erro ao campo, manter resumo navegável quando o
campo estiver em outra etapa e levar foco ao primeiro problema. Alerta no topo
não basta quando a revisão final esconde extras, observações ou destinatário.
Erros de stock devem dizer custódia, unidade e caminho à referência atual.

Sessão expirada deve preservar preenchimento compatível e abrir entrada com
retorno seguro. Acesso negado exige explicar a capacidade no paciente correto;
nenhum nome, metadata ou flag do navegador concede autoridade. Contexto trocado
deve invalidar tentativa incompatível, sem aplicar conteúdo a outro paciente.

PDF indisponível não altera a certeza de documento salvo. Anexo indisponível
não significa ausência de arquivo. Aviso incerto no provedor não pode ser
tratado como falha definitiva nem reenviado sem conciliação. O catálogo inclui
os caminhos sem renderização segura e o teste posterior necessário.

## Segunda passada e contraditório

Pedir para atualizar toda a página pode apagar edição e romper a tentativa.
Adicionar retry genérico também pode duplicar propostas globais, pois o
adaptador administrativo antigo gera chave no servidor (A BE-005, dependência
para B2). A solução precisa preservar intenção e permitir consulta autorizada.

Há implementações melhores no próprio produto: REQ e comandos definitivos
congelam tentativas em vários ramos; o servidor já distingue RECEIPT_PENDING
de persistência desconhecida; fila administrativa exige confirmação de
reconciliação. Reaproveitar esses contratos, sem relaxar segurança ou
transformar
todo erro numa nova página. Teste humano/leitor de tela dos anúncios e
homologação de provedor permanecem NOT_VERIFIED.
