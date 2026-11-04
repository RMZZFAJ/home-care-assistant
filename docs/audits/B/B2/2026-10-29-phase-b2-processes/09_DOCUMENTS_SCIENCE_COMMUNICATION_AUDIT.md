# Documentos, ciência, comunicações e continuidade

P-DOC-01–05/P-NTF-01–04. Sete cenários B28-01–07 em
[b28-results](evidence/b28-results.json), além de inspeção de navegador e de
quatro páginas de PDFs fictícios. A conclusão é operacional: a cadeia conserva
fatos distintos, mas uma pendência persistida pode ficar sem caminho de saída
ou sem aparecer na fila em que a pessoa procura trabalho.

## Qual fato permite continuar

- **Fato:** Documento emitido; **Responsável e consequência:** Autor autorizado
  grava versão, protocolo e evento; **O que deve continuar sendo conferido:**
  Persistência confirmada; destinatários e próxima ação

- **Fato:** Aviso enfileirado; **Responsável e consequência:** Regra seleciona
  público/canal; **O que deve continuar sendo conferido:** Não prova envio nem
  acesso

- **Fato:** Aviso interno disponível; **Responsável e consequência:**
  Trabalhador conclui processamento interno; **O que deve continuar sendo
  conferido:** Pessoa ainda pode não abrir o aplicativo

- **Fato:** Provedor aceitou envio; **Responsável e consequência:** Referência
  externa permite correlação; **O que deve continuar sendo conferido:** Entrega,
  leitura e falhas posteriores

- **Fato:** Provedor informou entrega/leitura; **Responsável e consequência:**
  Webhook autenticado correlaciona estado; **O que deve continuar sendo
  conferido:** Ciência depende do modo/política; não prova leitura integral

- **Fato:** Aviso marcado visto; **Responsável e consequência:** Titular
  organiza seus avisos; **O que deve continuar sendo conferido:** Não registra
  ciência, aceite ou atendimento

- **Fato:** Ciência registrada; **Responsável e consequência:** Identidade
  elegível e modo ficam na história; **O que deve continuar sendo conferido:**
  Material ainda pode não ter sido entregue

- **Fato:** ENT aceita positivamente; **Responsável e consequência:**
  Destinatário atesta material e custódia; **O que deve continuar sendo
  conferido:** REQ vinculada pode continuar bloqueada por
  divergência/cancelamento

- **Fato:** REQ concluída; **Responsável e consequência:** Necessidades
  atendidas conforme vínculos; **O que deve continuar sendo conferido:** Ciência
  e exceção de encerramento continuam independentes

- **Fato:** REQ arquivada; **Responsável e consequência:** Regra automática ou
  decisão manual motivada; **O que deve continuar sendo conferido:** Correção
  futura pode exigir reabertura preservando eventos

B28-01 emitiu REQ por HTTP, recebeu confirmação de persistência, localizou o
documento no banco e obteve PDF autorizado. B28-02 marcou um aviso familiar
como visto: atendimento permaneceu zero, ciência falsa e conclusão ausente.
Não se pode usar “notificação entregue” como evidência de material recebido.

## Ciência, atendimento e encerramento da necessidade

Política pode exigir família/supervisão, pessoas e condição all/any. A
elegibilidade inicial fica registrada; alterar cadastro atual não reescreve o
autor passado. Modos expressos e automáticos têm condições próprias. A ciência
por aplicativo exige versão; leitura correlacionada do WhatsApp e despacho
dependem das regras configuradas. Não foram enviados avisos externos nesta B2.

B28-03 tentou arquivar antes de atendimento e recebeu recusa. Em seguida,
administrador expediu uma unidade por ENT vinculada e a profissional confirmou
o recebimento. A REQ passou a concluída com ciência ainda pendente e exigência
de arquivo manual. B28-04 registrou ciência expressa familiar posteriormente;
a exceção original permaneceu. Administrador encerrou manualmente com motivo.
Preservaram-se emissão, atendimento atualizado, conclusão, ciência e arquivo
como cinco eventos/versionamentos distintos. Não há quantidade solicitada REQ.

A família precisa saber se deve tomar ciência, providenciar material ou apenas
decidir um encerramento excepcional. Um selo único de “concluído” perderia essa
distinção. Arquivo manual é recuperação existente, não autorização para afirmar
atendimento físico inexistente. Cancelar ou revisar a ENT pode alterar novamente
o atendimento; essa interação é testada na B2.9.

## Versão histórica, PDF e comprovação

B28-05 buscou novamente a versão 1 depois de arquivar a versão 5. O SHA-256 do
arquivo permaneceu `64af3bbe…`; o arquivo da versão 5 teve hash diferente.
São duas páginas por versão, rasterizadas e inspecionadas integralmente em
[pdf-inspection](evidence/pdf-inspection.json). A versão 1 mostra pendências;
a 5 mostra atendimento, ciência e os cinco eventos. Não foram observados cortes
de texto nas quatro páginas desta amostra. Isso não cobre todos os documentos,
tamanhos, dados extremos ou impressoras investigados pela B1.

Hash canônico do conteúdo e hash do arquivo PDF são objetos diferentes. A
verificação pública retornou somente correspondência verdadeira para o trio
documento/versão/hash fornecido. Não retornou o documento privado. Leitor sem
capacidade para COM recebeu 403 no PDF. Não foram comprovadas assinatura
digital, autenticidade clínica, presença física, captura de QR por câmera ou
aceitação humana. Documento antigo pode ser fiel à sua versão e estar superado;
quem o utiliza precisa consultar a situação atual antes de agir.

Retificação tem requisitos próprios por tipo e pelo que já ocorreu. Não é
edição retroativa de eventos. Recusa por versão antiga exige consultar de novo
e revisar a intenção; criar automaticamente outra operação pode duplicar o fato.
Oportunidade: resumo de mudanças e ação seguinte usando eventos já existentes,
sem construir um segundo histórico paralelo.

## Anexos: reserva, armazenamento e vínculo

O envio valida tamanho/tipo, sanitiza bytes, reserva identidade, grava em bucket
privado, finaliza e vincula. A reserva não equivale a arquivo pronto. Consulta
de arquivo pronto produz URL temporária; nenhuma URL assinada foi exportada.
Há vínculo com documento ou movimento e limites por alvo. A disponibilidade do
arquivo não altera quantidade recebida nem corrige divergência automaticamente.

B28-06 enviou PNG fictício por HTTP. Repetir os mesmos bytes e a mesma chave
retornou o mesmo ID, sem outro anexo; bytes diferentes com a mesma chave foram
recusados com 409. O banco confirmou `ready`, tamanho e hash. Não houve perda
de transporte injetada nesse cenário: ele comprova recuperação na API, sem
resolver o defeito de recuperação visual B1-ERR-001.

**B2-016, revalidação de A DB-004:** B28-07 reservou dez anexos novos e não
enviou seus arquivos. Todos permaneceram `quarantine`; a décima primeira reserva
foi recusada pelo limite. Assim, pessoas que abandonam tentativas podem perder
a capacidade de anexar um comprovante válido, embora não existam dez arquivos
prontos. A mesma chave ainda permite retomar uma reserva conhecida; não existe
saída explícita do usuário para abandonar chaves perdidas. Não se executou
limpeza para contornar a reprodução. Solução futura precisa conciliar prazo,
tentativas em andamento, auditoria, objetos armazenados e acesso, sem liberar
o limite apagando anexos válidos. Política de retenção pertence à decisão C.

## Comunicação e responsabilidade pela falha

Foram rastreados `src/lib/notifications/worker.ts`, `provider.ts`,
`document-notification.ts`, webhook, rotas de ciência/avisos/anexos/PDF e os
contratos preservados em evidence/contracts. Trabalhador usa reivindicação e
validação antes de concluir; autorização e versões precisam ser reavaliadas
antes do envio. Estado incerto após contato com provedor não admite reenvio
cego: duplicar mensagem também pode duplicar intenção de ação humana.

Configuração ausente conserva pendência; rejeição definitiva, rate limit,
resultado incerto e entrega posterior são estados diferentes. Há controles de
horário/canal e registros de tentativas, cuja eficácia externa não foi testada.
O aviso pode ser ignorado mesmo corretamente entregue. A recuperação operacional
é consultar o aplicativo e o documento autorizado; comunicações verbais devem
orientar a pessoa até esse fato, sem substituir seu aceite ou ciência.

O [guard de isolamento](evidence/isolation-check.json) confirmou ausência das
duas configurações de worker externo no Vault e fila de rede vazia. O cron local
continua processando estados internos. Isso explica “Disponível no aplicativo”
nas capturas, sem concluir que WhatsApp ou e-mail funcionam em produção.
Credenciais, destinatários reais, aceite de templates, opt-in e aparelhos
continuam não verificados; não foram modificados para fazer o teste passar.

## Fila de trabalho, consulta e segunda passada

Importação de ficha física (P-DOC-05) foi reconstruída em fonte, sem nova
execução.
O contrato é de arquivo legado: protocolos físicos1–11, dados conhecidos, extras
literais e estoque observado nullable. A prévia conta desconhecidos e rejeita
protocolo já registrado/produto sem associação. O banco autoriza todos pacientes
antes de replay, calcula hash do lote e conserva relatório por linha; uma linha
inválida não é transformada em fato válido. O adaptador registra documento
histórico e evento de importação, sem criar ENT, consumo ou saldo. Dados
ausentes
não viram zero/data/autor presumidos; status histórico delivered não comprova
uma entrega nova. Foto pode complementar a fonte, sem inferir campos não lidos.
Esse importador delimitado não é entrada genérica para novas operações ou
motivo para fabricar protocolos antigos. Alteração de seu escopo exige decisão
própria; fonte e contratos import_historical/legacy/register_legacy preservados.

Navegador da profissional mostrou fila padrão de entregas vazia, enquanto o
filtro Todas mostrou duas ENT com cancelamento aguardando consentimento
([vazia](evidence/b28-professional-empty-pending.png),
[todas](evidence/b28-professional-all.png)). São novas provas de renderização
de B2-003; os documentos não desapareceram. Ao abrir ENT-0004, a única decisão
operacional oferecida foi consentir e reconciliar; não havia recusar ou retirar
pedido, confirmando a lacuna B2-002
([snapshot](evidence/b28-consent-only.txt),
[página móvel](evidence/b28-consent-mobile-full.png)).
Captura móvel é emulação 390×844, não aparelho ou validação por profissional.

A segunda passada contrapôs “tudo concluído quando visto”, “ciência tardia
apaga exceção”, “PDF antigo muda com o atual”, “retry cria anexo duplicado” e
“pendência sumiu do sistema”. Essas hipóteses foram refutadas. Mantiveram-se
os problemas específicos de ausência na fila e de reserva sem saída. Consulta
de consumo antigo e concorrência entre processos seguem para B2.9. Não se
recomenda um novo centro universal de mensagens antes de corrigir seleção,
responsável seguinte e caminhos existentes.
