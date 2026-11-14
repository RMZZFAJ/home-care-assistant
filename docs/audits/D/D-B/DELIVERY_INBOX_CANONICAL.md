# Caixa de entregas — fechamento local de 06.2

D3.81 conclui ENT-02, a sétima composição prevista em06.2. As outras seis
conservam a [qualificação de D3.80](ENT_TRANSFER_CANONICAL_VALIDATION.json).
O ponto está concluído localmente; a etapa06 continua com06.3–06.6 pendentes.
[Resultados dirigidos](DELIVERY_INBOX_CANONICAL_VALIDATION.json).

Os cartões seguem o Modelo Integral: código, percurso, autores preservados,
recebedor designado, situação e próxima tarefa real. Concordância de uma
transferência e conferência pessoal têm rótulos distintos. A declaração
autônoma Equipe→Família recebe “Devolução de materiais”, sem inventar origem,
expedição, recebimento ou saldo. Fato histórico ausente aparece como ausente;
nomes atuais do perfil não substituem os snapshots.

A consulta existente recebeu apenas deliverySummary para a página autorizada.
Mantém capacidade ent.read, filtros antes da paginação, ordem, tarefas e
escopos nativos. Não consulta o diretório de pessoas nem acrescenta saldo.
Execute continua restrito a authenticated, com autorização interna. A API e
o consumidor recusam resumo ausente ou incompatível, sem vazio falso.

Acompanhar, Minhas participações e Histórico preservam os filtros completos.
Participação inclui as partes da transferência; não significa ser recebedor.
Filtros e página ficam na URL e sobrevivem a recarga, Voltar e Avançar. O
atalho da tarefa abre Atendimento; acompanhar abre a ficha. Uma consulta
antiga identificada mantém foco e suspende a tarefa até recuperar a leitura.
Recusa de autorização retira os dados. A navegação não confirma atos.

## Verificações proporcionais

- Nove unitários: contrato, fatos ausentes/corrompidos, URL e troca de paciente.
- Três casos com Auth real: nomes históricos após renomear perfis, conferência
  pessoal distinta, devolução autônoma, tarefas antes da página, filtros,
  recusas e grants. Documentos, eventos e movimentos não mudam pelas leituras.
- Quinze cenários distintos nos três perfis: seis aprovações iniciais
  preservadas e nove finais afetadas. Incluem101 tarefas/102 registros de
  histórico, páginas, recarga, Voltar/Avançar e recusa pessoal C043 original.
- Cinco larguras, comparação computada com o HTML, teclado, foco, axe completo,
  cores forçadas, movimento reduzido e nomes extensos. Captura320px inspecionada
  com rolagem real; mostra uma atualização em curso e tarefa suspensa.
- Preparação local207 sem reset, tipos e lint passaram. Instalação limpa,
  evolução legada e integração completa são gates da CI do SHA publicado.

As nove falhas iniciais permanecem nos artefatos ignorados. O tom literal das
abas inativas do modelo falhou AA em4,43; foi usado o token acessível da mesma
paleta. Um seletor de alerta também alcançava o anunciador de rotas do Next;
agora identifica o aviso real da consulta. Nenhuma regra do axe foi desativada.
Somente os nove cenários afetados foram repetidos.

## Banco e limites

A migration20261111140250 foi aplicada incrementalmente no projeto remoto
autorizado, após dry-run exclusivo e preservação da definição/ACL anterior.
São207 versões; definição e ACL coincidem com o local, e o dry-run final está
vazio. Sem reset, fixtures, Auth remoto ou sincronização do Vault. As classes
e contagens dos avisos de segurança existentes ficaram inalteradas; isso não
constitui aprovação global desses avisos.

Os105 estados originais permanecem57PASS/48PARTIAL, e os18 estados de UI não
foram promovidos. A estimativa global visual continua70%; não equivale à
aprovação individual das66 composições. DOC-A/B/C/D, assinatura e confiança
externa, rascunhos simplificados, menções e janela20min têm seus blocos próprios.
Não há prova de aparelho físico, AT ou zoom nativo400% neste incremento.
Sonar permanece OWNER_DEFERRED_SONAR_CONFIGURATION, sem aprovação do Quality
Gate. CI própria, conferência conjunta e gates humanos/provedor continuam
necessários. PR7 Draft; sem merge ou produção. Próximo ponto:06.3, BAL e agenda.
