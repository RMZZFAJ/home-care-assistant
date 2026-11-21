# D3.41 — declaração de transferência entre sessões

Base f233be9. Duas preparações privadas ENT separam família→equipe e
equipe→família por titular/paciente. Sem ficha ou versão fictícia: ambos os
alvos são nulos até a confirmação oficial. Texto, quantidade decimal
incompleta, busca, pessoas, origem e materiais escolhidos sobrevivem entre
sessões. Não se copia o estoque ou a lista inteira de pessoas para o rascunho.

Salvar e revisar não declaram, expedem, recebem ou movimentam estoque.
Retomada exige referência Auth atual, comparação e adoção explícita. Nomes
indisponíveis permanecem para substituição/remoção manual; a adoção não
converte quantidades. Erro403,200 inválido ou perda da consulta de estoque
retiram os fatos operacionais, preservando os próprios campos.
Consulta/descarte pessoal continuam disponíveis após perda de escrita, sem
buscar estoque ou abrir formulário oficial.

A confirmação salva antes da revisão e sela direção, pessoas, origem,
referência, motivo e quantidades. O RPC existente cria a declaração;
autorização e referência são verificadas novamente após o journal privado. Uma
resposta perdida é recuperada pelo mesmo pacote/chave, inclusive após perda de
escrita, sem outro POST oficial nem nova preparação. Replay não afirma que a
contraparte ainda está pendente.

41 testes unitários/API,8 cenários Auth reais e16 identidades de navegador
passaram. São oito por motor, com os fluxos antigos de três autores, material
inativo, recebimento parcial, PDF e conflito preservados.14 sucessos iniciais
foram reaproveitados; apenas dois casos antigos foram atualizados e repetidos:
alteração de estoque antes da revisão impede POST; outra alteração depois da
revisão é recusada pelo núcleo. Campos, fatos e ledger são comparados nas duas
fronteiras. Axe, quatro larguras e quatro capturas inspecionadas. Emulação não
é prova em aparelho físico.

As contraprovas de autoria local foram conservadas. A primeira instalação174
teve rollback integral por sintaxe; após correção, o teste Auth expôs alias
SQL ambíguo. A migration ainda não publicada nem aplicada remotamente foi
corrigida; somente a função local foi substituída, sem replay ou alteração do
histórico. O histórico local conserva os statements intermediários. O remoto
recebeu a versão final uma única vez; funções finais,ACL,constraint e digest
de174 versões coincidem. Dry-run final vazio; cinco classes de advisors sem
alteração, incluindo os avisos preexistentes.

21 fontes congelados e conferidos; os20 iniciais permaneceram iguais durante a
repetição, com apenas o teste legado acrescentado ao inventário. Sem
reset,fixture/Auth remoto,backup redundante,merge ou produção. A CI f233be9
falhou no caso REQ403 do WebKit; o Preview ficou READY. A falha e um teste de
anexos instável estão em investigação, sem aprovação global.

Matriz105x39 conserva primeiras30 colunas,56 PASS/49 PARTIAL e18 linhas
visuais. BAL/REQ contextuais e paridade integral66/171 continuam pendentes.
Assinatura,backup,monitoramento e gates externos não recebem nova aprovação
neste lote; Sonar segue adiado pelo titular. Meta ativa e PR7 Draft.

[Validação](TRANSFER_DECLARATION_DRAFTS_VALIDATION.json),
[remoto](TRANSFER_DECLARATION_DRAFTS_REMOTE.json),
[CI anterior](CI_F233BE9_OBSERVATION.json).
