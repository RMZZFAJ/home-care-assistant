# D3.18 — consulta de histórico com validação de resposta

Correção sobreccebfcb. Uma resposta200 com selected:null derrubou a página
inteira no ensaio de produção Chromium; screenshot, contexto e log do baseline
foram preservados. O teste esperava erro recuperável na seção, sem transformar
os fatos imutáveis em campos inválidos. Não houve mudança estética dos PDFs.

## Comportamento implementado

DocumentTimeline confere a projeção recebida antes de renderizá-la: documento
solicitado, versão exata, referência anterior explícita ou imediatamente
anterior, índice sem versões duplicadas, hash/ação correspondentes e conteúdo
textual dos fatos. Autoria desconhecida e de sistema exigem proveniência
consistente. Tipo/data/fatos malformados e resposta de outro documento/versão
viram falha de consulta, com Atualizar histórico desta seção.

Essa conferência da projeção não verifica criptografia ou integridade do
snapshot original. Hash canônico, hash do PDF e assinatura continuam tendo
verificações próprias. Ausência de nome/protocolo histórico permanece ausente;
código com zeros, decimal textual e aviso de fatos adicionais são preservados.
Metadata adicional da lista não é publicada como fato ou usada como autoridade.

useScopedRead aceita decoder opcional; a exceção é tratada pelo mesmo estado
de falha de leitura. Consumidores sem decoder conservam seu caminho anterior.
Somente o histórico adota esse decoder neste lote. A consulta fracassada não
exibe os fatos anteriores como resposta válida. Não há aria-invalid em output,
foco no campo histórico ou formulário para corrigir evento registrado.

## Provas e limites

O [manifesto](HISTORY_READ_BOUNDARY_EVIDENCE.json) registra fontes/coortes e
contraprovas. Dez unitários existentes e sete novos passaram; os sete novos
foram repetidos após trocar spread por redução no cálculo da versão anterior.
Sem limite artificial de número de versões ou estouro da pilha por spread.

A regressão de produção teve15 PASS nos três motores: três novos casos e doze
execuções dos quatro casos anteriores. O novo caso usa sete respostas
defeituosas por motor: selected ausente,
documento diferente, versão diferente, predecessor ausente, hash inconsistente,
fato não textual e autoria desconhecida pelo contrato. Cada erro permite retry
por Enter, preserva foco e recupera os valores históricos reais. A evidência
exige zero pageerror, zero comando API e história/ledger/emissões inalterados.
Os casos anteriores cobrem REQ/COM/ENT/BAL, seleção durante demora,503, nomes
congelados, acesso de leitura sem compra e negativas de autorização.

Não se adicionou teste de autorização baseado só em mock. As fixtures e
leituras usam Auth local real; as respostas200 defeituosas são contraprovas
controladas no transporte. Negativas esperadas de API ficam nos logs com código
seguro/correlação. Axe não foi reduzido. Emulação não homologa aparelho ou AT.

C034 conserva sua comprovação, com a regressão ampliada. C-FINAL-AC-023 passa
a PARTIAL para leitura do histórico; faltam a cobertura consolidada de ENT-03,
ESC-03, DOC-05, ARQ-02 e GUI-04 e os gates humanos/AT/aparelho pertinentes.
Este lote não declara todas essas superfícies concluídas.

Nenhuma migration nova. Local/remoto161 conforme o
[recibo aplicado](CREDENTIAL_REMOTE_MIGRATIONS.json), sem alteração dos SQLs
ou nova mutação remota. Não foi repetido backup/restore do banco de testes.
[CI da base](CI_CCEBFCB_OBSERVATION.json): validate Windows/Ubuntu SUCCESS,
banco em andamento e Preview estávelccebfcb READY na observação. Novo SHA exige
CI própria. Sonar adiado; PR7 Draft, sem merge/promoção. Assinatura/TSA,
backup/monitoramento e D-C/D6 conservam os limites dos seus dossiês.
