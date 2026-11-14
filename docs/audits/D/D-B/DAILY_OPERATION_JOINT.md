# Operação diária — conferência conjunta de 06.6

D3.85 fecha o escopo local original da etapa 06: as 46 composições diárias
conferidas em 06.1–06.5 e sua compatibilidade conjunta. A nova aparência dos
PDFs e as políticas adicionais DOC-A/B/C/D mantêm resultados próprios.
[Resultados dirigidos](DAILY_OPERATION_JOINT_VALIDATION.json).

## Correções e contraprovas

Os consumidores antigos passaram a localizar a tabela de materiais, a tarefa
da entrega e os fatos separados do relato. Mantêm as mesmas quantidades,
autores, ciência, estado e efeitos oficiais; a seleção da tarefa é limitada
ao ID real. O erro de leitura inválida corresponde ao parser atual.

A primeira rodada teve 34 aprovações e quatro falhas: três links antigos de
recebimento e o seletor ENT no WebKit. A medição deste último registrou a
borda inferior em 664,484375px para viewport 664px. O teste agora rola o
controle real ao centro antes e depois de abrir o popup, mantendo a
exigência original de 100% visível, além
de limites completos e hit-tests nas quatro bordas úteis. Não há redução da
razão, ocultação de sobreposição ou alteração da geometria por CSS de teste.
A auditoria de toda a página BAL normaliza a rolagem após redimensionamento,
com o helper existente; todas as regras axe continuam ativas.

A sincronização solicita reconsulta ao conectar seu canal. O catálogo
podia desabilitar nativamente o botão já focado durante essa transição.
Na reconsulta com dados autorizados retidos, os quatro botões de edição usam
aria-disabled e recusam seus handlers. Sem dados ou com erro continuam
nativamente desabilitados. Isso não concede autoridade nem inicia uma ação
posterior automaticamente. Uma regressão controlada retém o GET real após a
invalidação: foco permanece, Enter e clique nativo não abrem o editor nem
alteram o catálogo. Liberada a consulta, a tarefa original funciona.

Os casos intermitentes de parcela COM e seleção de aba passaram nos três
perfis. Não receberam retry de clique, mudança de timeout ou correção
especulativa. A falha de seleção de aba passa a guardar diagnóstico de URL e
estado dos controles, sem dados privados de formulário, preservando o erro
original.

## Qualificação proporcional

A segunda rodada teve 17 aprovações e cinco falhas: quatro no encerramento
da interceptação de teste, após passar a contraprova de foco, e uma borda
WebKit que voltou a ultrapassar a área visível ao receber foco. A limpeza agora
aguarda as rotas pendentes antes de remover o handler; os quatro casos
originais de edição por teclado e os quatro tamanhos de catálogo WebKit
passaram na repetição final. Os demais catálogos, transferência com três
autores e reconto foram preservados da segunda rodada. Somados aos
resultados iniciais inalterados, são 47 identidades de teste distintas
qualificadas, sem contar repetição como novo caso. Tipos e lint dos afetados
passaram, sem avisos. Relatórios, falhas e capturas anteriores foram retidos.

A comparação canônica e as cinco larguras 320/390/768/1024/1440px, cores
forçadas, movimento reduzido e teclado foram exercitados na fundação nos
três perfis. Os casos de catálogo mantêm nomes longos, busca por alias,
seleção manual, revisão e consultas independentes. As provas recentes dos
cinco pontos anteriores são reaproveitadas nos consumidores que permanecem
inalterados; a única mudança de produto deste incremento é o bloqueio com
preservação de foco nos botões de edição do catálogo.

Continuam presentes as negativas de Auth/RLS, separação entre pacientes,
revogação, consulta inválida, recuperação de resposta perdida, três autores,
recebimento parcial 3/5, ciência, integridade do arquivo e ausência de replay.
O teste de Flow conserva estoque 5 antes da confirmação e 3 depois dela.
Nenhum contrato de banco/API, assinatura, cache ou notificação foi alterado.

## Limites

Sem SQL novo. Remoto 207 atualizado e dry-run vazio, sem Vault, Auth remoto,
fixtures, reset ou alteração de infraestrutura. A CI do baseline e8a6adb
confirmou banco e validações Linux/Windows; navegadores estavam em execução
na observação. A CI do novo SHA continua necessária. O baseline 039ba70
reprovou consumidores de navegador e uma instalação WebKit por DNS/APT;
nenhum desses resultados foi apresentado como aprovação geral.

Os 105 estados originais continuam 57PASS/48PARTIAL; os 18 estados UI foram
preservados. Etapa06 original local 100%; visual global estimado 85%, sem
aprovar as outras 20 composições ou todas as 171 relações. Conferência final,
ampliação nativa 400%, AT, dispositivo físico e provedores mantêm seus gates.

DOC-A/C/D continuam 0%, DOC-B 10%: novo PDF, parecer BAL sem efeito de estoque,
retomada simples, acessos agrupados, menções e atos de cancelamento/complemento
não são concluídos por este incremento. Próximo bloco: complemento
operacional e documental de 07/09/10. Sonar permanece
OWNER_DEFERRED_SONAR_CONFIGURATION. PR7 Draft, sem merge ou produção.
