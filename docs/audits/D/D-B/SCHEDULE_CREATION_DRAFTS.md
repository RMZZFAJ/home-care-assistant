# D3.51 — novos tipos e programações com preenchimento privado

Novos tipos de plantão e novas programações podem ser guardados incompletos
no servidor e retomados pela mesma conta em outro aparelho. Campos,seleções
inativas,opções de repetição e versão escolhida do tipo são preservados.
Salvar não cria tipo,série,plantão,documento ou movimentação de estoque.
Alterações e decisões sobre recursos existentes continuam no fluxo anterior;
seus preenchimentos privados ainda precisam ser implementados.

## Confirmação e recuperação

O editor usa controles canônicos compartilhados e o controlador privado
existente. Ofertas,comparação CAS,resultados e tentativas incertas são somente
leitura. A programação conserva opções dos quatro regimes ao alterná-los.
Referências exibem rótulos atuais apenas sob autorização;adotar uma versão
nova exige escolha explícita e não substitui as demais edições.

Revisar primeiro salva a preparação. Confirmar sela sua revisão e cria o
recurso nativo com consumo privado,diário e auditoria na mesma transação.
Chave nativa já utilizada não pode vincular retroativamente um recurso antigo.
O banco passou a respeitar active=false na criação do tipo;esse erro nativo
foi corrigido por substituição de marcador único,sem mudar os demais atos.

A consulta de recuperação aguarda a chave original e revalida o vínculo.
Ausência continua desconhecida. Revisão privada avançada,chave incompatível
ou versão monotônica do tipo avançada podem provar a não aplicação daquele
pacote. Uma publicação já conhecida continua confirmada após outras mudanças.
A contraprova anterior à migration195 conservava revisão privada1 e tipo
alterado,mas retornava desconhecido;esse caso agora tem prova específica.

Outra conclusão não apaga a edição própria. Preservar para novo preenchimento
é escolha explícita e sobrevive ao reconhecimento perdido e à recarga.
Envelope divergente permanece intacto. Consulta,reload e retorno da conexão
não repetem publicação. O formato nativo anterior continua recuperável.

## Limites e validação

Leitura,descarte e reconhecimento próprios exigem vínculo vivo e continuam
disponíveis sem escrita ou com paciente inativo. Novas gravações exigem as
capacidades nativas atuais. Proponente restrito ao próprio profissional cria
proposta,sem publicar por conta própria. Revogação tardia reverte toda a
transação. Não há cache privado,replay offline ou transporte externo ativado.

43 testes unitários/API e13Auth reais qualificados. São12 identidades de
navegador de produção local:quatro casos preservados da primeira coorte e
oito da repetição dirigida,sem contar repetições como novos testes. Primeira
coorte8/12;recheck8/8. Espera por fechamento real,isolar paciente por engine e
origem de scroll da auditoria foram corrigidos nos testes. Cinco larguras,
axe e capturas320 inspecionadas têm escopo deste incremento.

A base local acumulou3659 pacientes/17675 vínculos no momento observado.
Contexto apresentou503 e o helper encontrou resposta sem data numa primeira
coorte. A repetição concluiu sem ocultar as ocorrências dos logs. Não houve
mudança de timeout nem exclusão de dados;desempenho/frescor amplos continuam
com Codex. A CI86f8f6e teve core e cinco shards aprovados;iOS2 falhou no alvo
parcialmente coberto da auditoria COM,com outras três intermitências. Auditoria
final agora usa a origem de página existente,sem desativar regras.

Remoto192→195 reconciliado antes do commit:três migrations,oito funções novas,
correção nativa delimitada,cinco dependências preservadas,duas tabelas fechadas
e sete índices iguais ao local;projeto saudável,probes0,dry-run vazio.
[Validação e limites](SCHEDULE_CREATION_DRAFTS_VALIDATION.json).
O inventário inicial49/51 permanece;novos controladores sem tag form própria
não viram novos formulários por contagem artificial.

CI própria,instalação limpa,legado e integração completa são gates separados.
105 critérios e18 estados UI não recebem promoção global por este lote.
Agenda existente,contagens e demais cadastros continuam com Codex. Sonar
adiado,PR7 Draft,sem merge ou liberação,meta ativa.
