# Histórico, PDFs completos e verificação de bytes

AS_IS: /historico, /historico/:id, /fichas/:id, /documentos/:id e
/verificar/:id; src/lib/server/operational-pdf.ts, document_events e
document_pdfs. Hash canônico, PDF versionado e rota de versão antiga existem.
B6 demonstra omissões/datas/proveniência, corte de célula e cache sem nova
comparação; B8-Q001 demonstra que testes atuais aceitam texto todo removido.
TO_BE DEC-015/016/017/018, com composição `PROPOSED_TECHNICAL_DEFAULT` e P09.

## Telas e campos

<!-- c-table:start -->

- **Tela:** DOC-01

  **Rota e situação:** /historico, atual a alterar

  **Objetivo e ações:** Buscar tipo/estado/data/protocolo e acessar qualquer
  versão autorizada.

- **Tela:** DOC-02

  **Rota e situação:** Detalhe compartilhado, atual a alterar

  **Objetivo e ações:** Antes/depois humano, autores, motivo, datas, anexos e
  download da versão exata.

- **Tela:** DOC-03

  **Rota e situação:** PDF privado, atual a corrigir

  **Objetivo e ações:** Gerar/recuperar bytes corretos, imprimir/compartilhar
  conforme acesso.

- **Tela:** DOC-04

  **Rota e situação:** /verificar/:id, atual a ampliar

  **Objetivo e ações:** Consultar registro mínimo e comparar exemplar
  selecionado com bytes finais.

- **Tela:** DOC-05

  **Rota e situação:** Comparar arquivo, novo controle do verificador

  **Objetivo e ações:** Escolher PDF, calcular digest/consultar referência;
  resultado não depende só do QR.

<!-- c-table:end -->

<!-- c-table:start -->

- **Campo:** Documento/tipo/protocolo

  **Tipo/origem:** Registro do banco

  **Obrigatório e default:** Sim, leitura

  **Validação/unidade:** Série por paciente/tipo, UUID e versão

  **Ajuda e exemplo:** Protocolo físico importado tem origem própria.

- **Campo:** Versão documental/renderizador

  **Tipo/origem:** Servidor

  **Obrigatório e default:** Sim em cada download

  **Validação/unidade:** Não substituir versão ausente pela atual

  **Ajuda e exemplo:** “Versão 3, representação PDF rX.”

- **Campo:** Data do fato/registro/emissão

  **Tipo/origem:** Eventos/snapshot

  **Obrigatório e default:** Conhecidos; desconhecido explícito

  **Validação/unidade:** Fuso/offset e rótulos próprios

  **Ajuda e exemplo:** Criação de draft em D1 não é emissão em D2.

- **Campo:** Autor/revisor/recebedor

  **Tipo/origem:** Snapshot do ato

  **Obrigatório e default:** Conforme fato, leitura

  **Validação/unidade:** Nome histórico e identidade; atual rotulado
  separadamente

  **Ajuda e exemplo:** Revogação/rename não muda autoria antiga.

- **Campo:** Estado por linha/documento

  **Tipo/origem:** Fatos versionados

  **Obrigatório e default:** Sim quando aplicável

  **Validação/unidade:** Terminal não cai em “pendente” por fallback

  **Ajuda e exemplo:** Cancelada não orienta receber.

- **Campo:** Motivo/ressalva/antes-depois

  **Tipo/origem:** Evento preservado

  **Obrigatório e default:** Quando conhecido

  **Validação/unidade:** Não reconstruir por cadastro atual

  **Ajuda e exemplo:** Desconhecido não é preenchido com texto inventado.

- **Campo:** Arquivo a verificar

  **Tipo/origem:** Bytes selecionados pelo usuário

  **Obrigatório e default:** Para comparar exemplar

  **Validação/unidade:** Limite explícito; hash sem executar conteúdo; não
  conservar upload por padrão

  **Ajuda e exemplo:** “Selecione o arquivo que deseja comparar.”

- **Campo:** Hash canônico

  **Tipo/origem:** Referência do banco

  **Obrigatório e default:** Leitura

  **Validação/unidade:** Identifica conteúdo lógico, não bytes PDF

  **Ajuda e exemplo:** Não usar esse hash como digest do arquivo.

- **Campo:** Hash dos bytes finais

  **Tipo/origem:** Registro confiável de emissão

  **Obrigatório e default:** Sim para PDF emitido

  **Validação/unidade:** SHA-256 após todos os bytes finais; comparar no
  cache/download

  **Ajuda e exemplo:** QR sozinho não verifica o exemplar.

- **Campo:** Resultado da comparação

  **Tipo/origem:** Comparação de bytes/digest

  **Obrigatório e default:** Após referência confiável

  **Validação/unidade:** Coincide/diverge/sem referência/indisponível
  distintos

  **Ajuda e exemplo:** “Este arquivo coincide com a versão emitida
  registrada.”

<!-- c-table:end -->

## Conteúdo mínimo por tipo

Todos: identidade/protocolo/tipo/versão; paciente conforme autorização;
fonte/origem; estado; autores dos atos; data do fato, do registro e da
emissão; itens/unidades; ressalvas; links/QR de consulta; digest de arquivo
identificado sem circularidade; hash canônico e revisão do renderer; página e
continuidade. Não imprimir segredo, token ou URL assinada de arquivo privado
como prova pública.

<!-- c-table:start -->

- **Tipo:** REQ

  **Conteúdo material obrigatório no desenho:** Material/extra, urgência,
  observado com modo/instante, ciência com modalidade, estado/ENT por linha,
  necessidade remanescente e motivo

  **Distinções que o teste precisa conferir:** Zero observado, desconhecido e
  não preenchido; sem quantidade solicitada inventada; ciência não é
  atendimento.

- **Tipo:** COM

  **Conteúdo material obrigatório no desenho:** Compra/doação,
  previsto/aprovado/adquirido, parcelas informadas/rejeitadas/validadas com
  identidade/autoria, saldo da expectativa e dispensa inferior

  **Distinções que o teste precisa conferir:** Chegada não validada não é
  saldo; dispensa remanescente não é recebimento; motivo de rejeição
  permanece.

- **Tipo:** ENT

  **Conteúdo material obrigatório no desenho:** Origem/destino/recebedor
  designado, expedição, trânsito, aceites por parcela/linha, avaria/nota,
  diferenças received/returned/missing, cancelamento e exceção

  **Distinções que o teste precisa conferir:** Emissão usa evento correto;
  aceite físico é pessoal; encerramento administrativo não afirma recebimento.

- **Tipo:** BAL

  **Conteúdo material obrigatório no desenho:** Regime/atribuição/janela,
  autor de cada contagem, referência/contado/diferença, revisão de ledger,
  grupos/aprovações por versão, reconto e regularização

  **Distinções que o teste precisa conferir:** Revisor não é contador;
  aprovação velha não aprova versão atual; contagem atual não ocorreu no dia
  passado.

<!-- c-table:end -->

Legado: nome e data históricos conhecidos têm prioridade com proveniência;
ausente imprime “Não informado na origem”. Data de importação aparece
separada. Original preservado é distinto de representação derivada do legado.
Nenhum renderer novo substitui bytes históricos já emitidos; nova
representação recebe identidade própria e continua vinculada à versão de
conteúdo.

## Fidelidade, layout e acessibilidade

Célula que excede a área útil deve ser dividida em fragmentos, com cabeçalho
repetido e marcador de continuidade; nunca desenhar a célula inteira além do
rodapé. Nome válido com 160 caracteres com quebras internas e observação longa
são casos obrigatórios. Texto final deve estar visível, extraível e dentro da
geometria da página. Não resolver cortando silenciosamente
observação/material. Se não representável, erro explícito recuperável, sem
arquivo incompleto anunciado como válido. Compra e doação, BAL/reconto e
cancelados têm títulos corretos. Rodapé não pode sobrepor conteúdo, inclusive
em impressão em cinza.

Idioma, headings/tabelas e ordem semântica precisam de teste estrutural e AT.
Extração de texto sozinha não demonstra PDF acessível. Se a biblioteca atual
não atender tags, avaliar evolução ou alternativa HTML completa/autorizada com
os mesmos campos/versão; aceite da alternativa depende de P10 e uso real.
Layout inicial pode ser sóbrio sem novo redesenho gráfico amplo.

## Verificador e limites da autenticidade

O registro confiável associa documento/versão/renderer a digest dos bytes
finais imutáveis. O hash desse arquivo não pode ser escrito dentro dele como
se fosse fixpoint: usar referência externa/manifesto e QR com identidade da
versão; conteúdo canônico pode conter seu próprio digest conforme contrato
existente, mas não confundir as duas referências.

Selecionar exemplar calcula hash em ambiente controlado e consulta referência
mínima confiável. Caminho inicial proposto: cálculo local dos bytes no
browser, sem enviar conteúdo; comparação no serviço confiável. Se for
necessária prova de digest calculado no servidor, endpoint faz streaming
limitado sem interpretar o PDF e descarta bytes após comparação. Não aceitar
digest informado pelo usuário como prova independente de que ele enviou
determinado arquivo ao servidor. Resultado não revela nome/material nem prova
realidade do fato ou autoria legal.

QR de um documento legítimo pode ser copiado para PDF alterado: consulta pode
achar o registro, mas a comparação do exemplar deve divergir. Sem referência
ou serviço indisponível não significa falso; informar impossibilidade de
verificar. Assinatura criptográfica incorporada do sistema é mínimo P09-B, com
chaves/cadeia/custos a definir, sem alegar assinatura pessoal/ICP-Brasil.

## Recuperação e aceitação

Download revalida acesso e digest do cache; mismatch não transmite bytes como
válidos nem substitui original silenciosamente. Dois renders da mesma
identidade seguem determinismo definido; geração interrompida usa
tentativa/registro atômico de ready. Compartilhar não muda estado operacional.
Revogar não recolhe cópia baixada; novo download segue P15. Restauração inclui
bytes e referências.

Oráculo B8-Q001 deve reprovar PDF sem texto/fato crítico, mesmo com páginas,
metadata e QR corretos; contraprova com conteúdo esperado passa. Conferir por
tipo/estado: campos/atores/versão extraídos, geometria, raster e impressão/AT
humanos. Mutante de título e mutante em branco devem falhar por razões
próprias. Cache alterado diverge; legado dataNULL continua desconhecida;
anotação passiva não desaparece silenciosamente; versão antiga continua
recuperável. B6-007/008 são gates dos caminhos documentais afetados, sem
homologação presumida em C.

## Atualização vinculante C7–C10

P09-B aprova assinatura criptográfica incorporada do sistema como mínimo
obrigatório. Versão da ficha, emissão, hash canônico e hash dos bytes finais
são distintos. Baixar mesmo exemplar conserva bytes; nova emissão tem
ID/instante/solicitante/assinatura próprios. Perfil/cadeia/custo são gates,
sem IP/GPS no PDF/QR por padrão.

Esta atualização substitui alternativas/recomendações anteriores conflitantes;
não anuncia implementação. Contrato detalhado no
[adendo C7](../C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md),
[blueprint C8](../C8-visual-blueprint/VISUAL_BLUEPRINT_BY_SCREEN.md) e
[casos C9](../C9-acceptance-refinement/ACCEPTANCE_CASES.csv).
