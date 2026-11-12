# DOC-B.4 — cancelamento, ciência e vínculos no PDF

Concluído localmente em 11/11/2026 no escopo de fatos e atos de DOC-B. A revisão
V15 integra o gerador, a assinatura PAdES-B-T e o armazenamento existentes.
DOC-B.1–DOC-B.4 estão concluídos no fluxo atual. A fase D-B continua em execução;
a aparência aprovada, modalidades e integração final pertencem a DOC-A/C/D.

## Conteúdo congelado

O banco escolhe os atos até a versão documental solicitada. A V15 contém:

- Cancelamento: estado no corte, ato preservado, versão, autor, instante e
  motivo. Estado antigo sem ato preservado é indisponível, sem ciência presumida.
- Ciências próprias do cancelamento registradas até esse corte, separadas das
  ciências anteriores da emissão e do recebimento. Ler o PDF não confirma nada.
- Complementos: sentido da relação, ato próprio e documento referenciado com
  código, protocolo, versão e hash existentes na vinculação; motivo, autor e
  instante próprios. São referências textuais da versão consultada, não uma
  declaração de atendimento ou de movimentação de estoque.

A integridade do vínculo é conferida contra o evento canônico e seu hash
anterior, além do evento da versão referenciada. Não se reconstrói por nome,
saldo atual ou aproximação. Atos posteriores ficam fora de um corte anterior.

Referência restrita não contém identificação, motivo ou autoria da outra ficha.
O arquivo mostra Acesso restrito. Um exemplar antigo conhecido que contém esses
dados deixa de ser acessível se a leitura da ficha relacionada for revogada:
consulta, recuperação da intenção, conclusão e download usam a guarda comum.
Uma nova intenção pode congelar a representação restrita; o arquivo anterior
permanece intacto. Tabela/lista de emissões conserva seus metadados autorizados.

A V15 conserva os saldos históricos COM, a aplicação e os atos posteriores BAL,
a devolução autônoma e os demais fatos anteriores. As intenções antigas mantêm
revisão, fonte e identidade. A API corrente usa V15; as reservas de compatibilidade
continuam recuperáveis. Re-download mantém os mesmos bytes e a assinatura.

## Verificação proporcional

Oito cenários Auth reais passaram: quatro tipos com cancelamento, confirmação e
vínculo; corte anterior; recuperação; referência financeira restrita; revogação;
concorrência; espera real; rollback após perda tardia de leitura; BAL aplicado.
As negativas de grants mantêm auxiliares fechadas e a nova RPC somente Auth.

Dezesseis verificações unitárias/PDF distintas passaram: seis novas e dez
preservadas de COM, BAL e devolução. Incluem motivo extenso, ciências distintas,
referência exata, alteração de conteúdo, corte indevido, referência restrita com
payload indevido, estado histórico ausente, saldo conhecido e rota autônoma.

Quatro percursos em produção local passaram pelo runner guardado. REQ, COM,
ENT e BAL geraram arquivos prontos com perfil PAdES-B-T, validação aceita e
SHA-256 correspondente aos bytes baixados. Também foram gerados um exemplar
anterior da REQ e um exemplar restrito para outro papel: os dados financeiros
não aparecem neste último, e o download da cópia conhecida é recusado. Novo
download conserva bytes; a emissão anterior continua igual após os novos atos.
São provas locais com identidades e certificado/TSA internos de teste, não
homologação física, humana, ICP-Brasil ou TSA independente.

Sete arquivos, seis assinados nativos e um controlado, totalizaram28 páginas
renderizadas. A visão geral e os trechos novos em tamanho de leitura foram
conferidos. O primeiro conjunto foi preservado: um título ficava isolado no fim
da página em BAL/ENT. O bloco agora reserva espaço para o título e o primeiro
fato; os quatro casos e as verificações afetadas passaram novamente. Motivos
longos, continuação, rodapés, QR e páginas permaneceram legíveis. O primeiro
preparo também preserva a recusa de sintaxe antes de aplicação; não houve reset.
Tipos, lint dos afetados e build de produção passaram.

## Remoto e próximos blocos

Migration 20261112014602 aplicada no projeto autorizado: 224 versões reconciliadas,
oito definições/configurações/grants e sete triggers iguais ao local,
normalizando apenas CRLF. Dry-run vazio. Sem tabela ou índice novo;84 migrations
históricas preservadas. Nova reserva exclusiva de authenticated, auxiliares
fechadas e busca segura nas funções. Sem reset, fixtures/Auth remotos, produção,
ativação externa ou backup pesado redundante.

Advisors: um aviso Auth definer novo, a reserva intencional V15. Total 220;
demais classes de segurança e performance preservadas. A [orientação das RPCs autenticadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
permanece registrada; os avisos anteriores não recebem aprovação genérica.

DOC-B está em 100% do acréscimo local definido. Os 105 critérios originais mantêm
57 PASS/48 PARTIAL;18 estados UI e estimativa visual global85% permanecem.
CI do SHA publicado, instalação limpa, evolução legada e integração completa
continuam gates próprios. Sonar permanece adiado por decisão do responsável.
Próximo: DOC-A, aparência aprovada dos documentos. DOC-C conserva modalidades,
menções, acessos e retomada simples; DOC-D conserva integração e conferência dos
links documentais, QR, exemplos e abertura autorizada após login.

## Consumidores do formato atual

A rodada dirigida passou 14 percursos Chromium após atualizar as expectativas
da revisão atual, as reservas controladas V5/V6 a partir do evento canônico,
a aplicação BAL explícita após o parecer e a coluna de saldo COM. Preservou
formatos antigos, bytes, permissões e negativas. Tipos e lint dirigidos passaram.
A CI do novo SHA continua independente; falhas intermitentes do commit anterior
não recebem aprovação por esta seleção.
