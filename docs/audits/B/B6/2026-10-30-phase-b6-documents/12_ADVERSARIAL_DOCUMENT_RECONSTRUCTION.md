# B6.12 — Reconstrução adversarial e contraditório

A matriz mestre evidence/SCENARIOS.csv cobre23 cenários/pontos novos e 12
referências anteriores, sem chamá-los35 E2E. Cinco pontos SQL mutáveis em três
transações bem-sucedidas foram integralmente revertidos; três agregados são READ
ONLY. Onze casos são renderização; há cache controlado, sanitizador, QR offline
e cinza digital. Cada registro distingue fonte/declaração, evento, versão,
snapshot, história, tela, PDF, anexos, recuperação e interpretação.

## Segunda passagem que acrescentou evidência

B612-S01 criou COM10, adquiriu3, declarou duas parcelas1+1 como familiar e
rejeitou uma/validou outra como administrador. Todos os comandos foram RPCs
vigentes sob claims de duas sessões Auth fictícias. Ao fim, duas receipts com
estados diferentes e motivo existiam, crédito validado era1. O snapshot de
declaração não continha receipts e ambos eventos com.receive omitiam receiptId
do registro que criaram. O retorno atual da API continha as parcelas. Assim, não
é perda de registro nem crédito errado; é falta de elo inequívoco no evento
criador e representação histórica incompleta. Não reexecutar PDF: a projeção
inalterada já foi examinada em PV02 e no código. Primeira montagem SQL ambígua
do instrumento foi corrigida, com rollback; ATTEMPTS separa o incidente.

B612-R02 investigou o único evento de ator nulo sem authority system do agregado
B63: um req.legacy_imported sem authority. Não é evidência de tarefa automática
atual inventada. Legado sem contexto precisa qualificação, sem atribuir autoria
original a quem importou ou preencher assinatura fictícia.

## Contraprovas e hipóteses refutadas

- Renomear emissor/paciente não reescreveu hash/identidade antigos; B62-S01.
- Mesmo código em dois pacientes não é colisão de documento; protocolo e UUID
  distinguem identidade; B62-S03.
- Versão inexistente não vira versão atual; original ausente não é regenerado;
  cache privado não contorna autorização; B47 reaproveitado.
- Não existe falha geral de palavra longa ou paginação comum: PV08/PV07
  preservam conteúdo; PV09 isola célula mais alta que a página.
- Sanitizador não apaga toda ressalva: content stream preservado, FreeText/Ink
  removidos; contraprova visual B68-C01.
- Continuação não perde identidade de documento: código/versão e página ficam no
  rodapé. Não classificar espaço livre intencional como corrupção.
- QR carrega versão/hash exatos e não nome do paciente; consulta mínima não é
  vazamento do documento completo nem assinatura digital.
- Nome dos revisores BAL aparece na história. O achado é ausência de ligação a
  grupo/contagem, sem afirmar ausência total de autoria ou aprovação no banco.

## Limites de reconstrução

REQ arquivada/reaberta, ENT com consumo e COM parcial reutilizam B36; revisão
salva/submissão recusada reutiliza B44; identidade/autoridade entre pacientes
reutiliza B3/B47. Não fazer replay mecânico dos 25 cenários sugeridos na ordem.
Nome histórico, unidade anterior, inativação, papel revogado e evento system
foram confrontados com snapshots/contratos; nem todas as combinações receberam
novo ensaio dinâmico. Campo com fallback não autoriza inventar original.

Autenticidade humana, presença, fato físico, pagamento, recebimento material e
assinatura não decorrem automaticamente do hash, QR ou perfil profissional.
Impressão real, AT, câmera física, restauração conjunta e operação externa
permanecem NOT_VERIFIED. Essas limitações não são falhas atuais reproduzidas.
Treze registros deduplicados no mestre distinguem nove causas novas, duas
manifestações anteriores, um risco aprofundado e uma revalidação.
