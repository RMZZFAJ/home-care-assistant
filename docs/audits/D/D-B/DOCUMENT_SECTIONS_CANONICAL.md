# Seções documentais — fechamento local de 06.5

D3.84 conclui as nove composições DOC/ARQ/RAS previstas no ponto06.5,
no escopo original local. A etapa06 conserva a conferência conjunta06.6.
[Resultados dirigidos](DOCUMENT_SECTIONS_CANONICAL_VALIDATION.json).

| Composição C8 | Implementação conferida |
| --- | --- |
| DOC-01 Localizar documento | Lista completa, filtros e retorno preservados. |
| DOC-02 Consultar história | Eventos, autoria e fatos congelados separados. |
| DOC-03 Emitir/baixar | Exemplar próprio, versão exata e mesmos bytes. |
| DOC-04 Consultar código | Referência pública mínima e limites explícitos. |
| DOC-05 Comparar exemplar | Bytes, assinatura, cadeia e tempo separados. |
| ARQ-01 Anexar | Reserva, conversão, arquivo pronto e origem preservados. |
| ARQ-02 Recuperar/abandonar | Diálogo contextual, recuperação e foco seguro. |
| RAS-01 Retomar edição | Resumo por campo, fonte e etapa de origem. |
| RAS-02 Comparar edições | Dois conteúdos integrais e escolhas manuais. |

## Composição e contratos preservados

FileRecord compartilha a linha de arquivo do modelo entre anexos, exemplares
assinados e legados. Mantém nome completo, fatos, identificação, ressalvas e
ações nativas. Em telas estreitas, as ações vêm abaixo do conteúdo. Consulta
não emite outro exemplar; baixar e visualizar mantêm os bytes registrados.
O legado continua com desconhecidos explícitos, sem assinatura retroativa.

DocumentRow usa o registro e marcador canônicos. A Central de fichas conserva
esse marcador compartilhado; suas regras antigas foram removidas dos tokens
e do CSS anterior. Filtros, paginação, estado, tarefa e vínculo permanecem.

A cronologia documental usa a composição de eventos do modelo. VersionFacts
e antes/depois usam DefinitionGrid com chaves estáveis da fonte para fatos
com rótulos repetidos. Os autores e os materiais históricos não são
substituídos pelo cadastro atual. A versão ausente não cai na versão atual.

O verificador público separa consulta ao código e comparação do exemplar,
com nome integral do arquivo escolhido. Resultados de registro, bytes,
assinatura, cadeia e tempo permanecem próprios. A página não recebe dados
privados do paciente. Certificado e TSA internos continuam distintos de
assinatura pessoal, ICP-Brasil e tempo independente de terceiro.

Resumos privados conservam campos, etapa, referência e desconhecidos.
Comparações mantêm ambos os textos e empilham as edições em telas estreitas.
A nova política simplificada de retomada ainda pertence a DOC-C: este
incremento não declara implementados o diálogo único ou a reorganização
integral desses fluxos. Os componentes de leitura poderão ser reaproveitados.

O abandono de reserva usa o Dialog compacto já existente. Escape e Voltar não
decidem; falha
mantém a mesma tentativa. Após confirmação, o foco volta à atualização da
seção, pois o acionador deixa de existir. O chamador fornece uma resolução
estável do destino conforme o resultado confirmado. O diálogo depende da
lista autorizada e é fechado quando a consulta ou o comando perde acesso.
Arquivos prontos e histórico continuam preservados.

## Qualificação e contraprovas

Foram qualificados45 cenários distintos:29 aprovações iniciais inalteradas,
dez da segunda rodada, dois consumidores de compatibilidade e quatro finais.
As três novas
composições abrangentes percorrem os três perfis; consumidores adicionais
foram selecionados proporcionalmente em Chromium. Repetições não contam
como novos cenários. Tipos e lint estrito dos afetados passaram.

As cinco larguras320/390/768/1024/1440px comparam linhas, marcadores e grades
com o HTML isolado. Probes de estilo usam somente suas classes originais;
não adicionam CSS ou alteram o DOM da aplicação. Axe permanece completo;
cores forçadas, movimento reduzido, teclado e retorno de foco foram
conferidos. Capturas de anexos, exemplares, resultado, comparação e diálogo
foram inspecionadas, com rolagem e limites reais, sem ocultar a navegação.

Preservadas as verificações nativas de versões e arquivos exatos, fontes,
nomes históricos, mais de100 documentos, paginação, consulta incompleta,
RLS, resposta perdida, impressão de origem, bytes divergentes, recusa de
formato, limite e timeout. O descarte privado não cria ato oficial.
A negativa adicional revoga o vínculo real antes do PATCH; a API recusa a
operação, o diálogo some e a reserva permanece em quarentena sem abandono.

A primeira rodada teve33 aprovações e nove falhas. As novas asserções foram
corrigidas para capturar a referência depois do anexo autorizado, manter os
eventos antigos integralmente, usar a rota de acervo e aguardar a comparação
que já estava em consulta. Um consumidor antigo passou a usar a rolagem real
ao topo antes da auditoria, evitando conteúdo sob o cabeçalho após
redimensionar.
A segunda rodada teve11 aprovações e duas falhas de foco após abandono.
As rodadas intermediárias qualificaram foco, negativa e compatibilidade.
A inspeção adotou o Dialog compacto existente, com destino de foco por
callback estável, sem ampliar o painel de edição. A rodada final qualificou
esse componente nos três perfis e a negativa nativa. Relatórios, artefatos e
capturas anteriores foram preservados.
Nenhuma regra, negativa operacional ou timeout existente foi reduzido.

## Banco e limites

Sem SQL novo. Remoto207 reconciliado, dry-run vazio, sem Vault, reset, Auth ou
fixtures remotas. Instalação limpa, evolução legada e integração completa
continuam na CI do próprio SHA, sem reset local redundante.

Os105 estados originais permanecem57PASS/48PARTIAL e os18 estados UI não foram
promovidos. Etapa06 estimada97%, visual global85%; estimativas não aprovam
individualmente as66 composições ou171 relações. DOC-A/B/C/D têm blocos
próprios: aparência dos PDFs, retomada simples, acessos agrupados, menções,
novos atos documentais e separação do parecer BAL continuam pendentes.

Conferência conjunta, AT, zoom nativo400%, aparelho físico e provedores mantêm
seus gates. Sonar: OWNER_DEFERRED_SONAR_CONFIGURATION, sem aprovação do Quality
Gate. A CI do baseline039ba70 passou banco e validações Linux/Windows. Os shards
de navegador apontaram consumidores antigos, foco e geometria; uma instalação
WebKit falhou por DNS/índice APT do runner. Esses pontos continuam em06.6.
A CI deve validar o SHA publicado. PR7 Draft, sem merge ou produção.
Próximo:06.6, conferência conjunta da operação diária.
