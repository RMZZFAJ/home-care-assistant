# Preparação da primeira residência e contingência

**Piloto não liberado para operação.** Este roteiro conecta os controles
implementados aos gates humanos de D-C/D6. Nenhuma residência, pessoa ou serviço
foi escolhido automaticamente. Responsável operacional e substituto estão
**a designar pelo responsável do projeto**. Configuração, ensaio interno,
homologação de provedor e liberação operacional são registros distintos.

## Registro de preparação

Na administração global, abrir **Preparar residência**. Salvar e retomar o
rascunho antes do cadastro, sem usar um paciente de fixture como residência real.
Escolher estado inicial, fuso, conta administradora inicial, titular e substituto
da continuidade e prazo de resposta. Titular e substituto precisam ser pessoas
distintas. Não escolher um prazo para representar SLA ou suporte24h inexistente.

A preparação permite cadastro inicialmente inativo. A etapa salva não significa
tarefa concluída; produção permanece não aprovada. Em conflito, comparar a revisão
vigente antes de manter a proposta ou carregar o servidor. Em resultado incerto,
recuperar a mesma intenção antes de repetir o cadastro. O criador global não
recebe vínculo operacional automaticamente.

| Responsabilidade | Designação atual | Controle ou registro exigido |
| --- | --- | --- |
| Aprovação do piloto | A designar | Gate humano D-C, com escopo e data |
| Administração local | A designar | Conta confirmada e vínculo deste paciente |
| Operação e continuidade | A designar | Titular da continuidade na preparação |
| Substituição | A designar | Pessoa distinta, aceite e disponibilidade |
| Conferência familiar | A designar | Capacidades por ato e custódia |
| Suporte técnico | A designar | Modo global sem vínculo clínico implícito |
| Custódia e backup | A designar | Guarda separada e recuperação ensaiada |

As seleções de equipe são planejamento. Convites, aceite e capacidades por
paciente usam seus fluxos próprios. Conferir uma conta não comprova presença,
recebimento, ciência ou execução do plantão. Não compartilhar credenciais ou
promover uma conta para contornar uma recusa de autorização.

## Conferência antes do primeiro ciclo

1. Confirmar paciente, estado inicial e fuso. Manter identificadores reais
   somente no registro autorizado; este roteiro não recebe dados pessoais.
2. Em Pessoas e vínculos, conferir administração inicial, equipe, aceite e
   capacidades. Entrar com as contas de cada papel no ensaio apropriado;
   a visão global não substitui o acesso efetivo do vínculo local.
3. Conferir catálogo canônico, unidades/apresentações e custódias. Informar
   estoque inicial pelo movimento autorizado, com motivo e referência.
   Estoque desconhecido não deve ser convertido em zero.
4. Conferir escalas, fuso e regras de BAL. Escala não comprova presença física.
   Adiamento, reconto e revisão usam as decisões e versões próprias.
5. Percorrer REQ, COM/doação, ENT, divergência/recebimento, BAL e consumo em
   ensaio autorizado. Requisição não pede quantidade de compra; aviso e download
   não registram ciência. Conferir o histórico e os efeitos correspondentes.
6. Conferir identidade da emissão, versão, autoria e conteúdo do PDF. Verificar
   por QR/código/upload sem compartilhar chaves. Assinatura e TSA internos
   continuam distintos de ICP-Brasil e de tempo independente de terceiro.
7. Conferir instalação/atualização e recuperação da PWA nos aparelhos reais.
   Consentimento Web Push é por aparelho; entrega de um aviso não comprova
   leitura, ciência ou funcionamento em todos os dispositivos.
8. Conferir responsáveis, contingência, backup, recuperação e incidentes.
   A conferência da preparação nunca substitui os gates abaixo.

## Canais e serviços ainda sem homologação

Conservar transporte externo desligado até o gate correspondente. A presença
de credencial, certificado, regra ou nome de variável não comprova homologação.

| Controle | Estado exigido antes de homologar | Conferência |
| --- | --- | --- |
| NOTIFICATIONS_EXTERNAL_ENABLED | false | Responsável de infraestrutura |
| META_FLOWS_ENABLED | false | Responsável de integração |
| WEB_PUSH_EXTERNAL_ENABLED | false | Responsável de integração/aparelhos |
| Regras locais | Destinos aprovados | Administração local |
| Backup automático | Inativo sem configuração/ensaio | Operador |
| Monitor externo | Nenhum ativo por padrão | Suporte |

Esses valores são a condição do gate, não uma declaração sobre toda configuração
externa existente. Antes de liberar, confrontar o ambiente correto e registrar
a observação sem expor valores secretos. Nesta etapa não se alterou produção.
Avisos internos e consulta de pendências continuam sendo o caminho de
acompanhamento; não tratar ausência de push como ausência de tarefa.

## Falta de conexão ou indisponibilidade

1. Acionar titular ou substituto pelo canal previamente acordado. Se o canal
   também estiver indisponível, seguir a combinação presencial documentada.
   O software não oferece atendimento24h nem substitui esse acordo humano.
2. Guardar registro provisório seguro de fato, pessoa, data/hora conhecida,
   paciente e referência da tarefa. Identificar como contingência; não criar
   protocolo ou hash que pareça ter sido emitido pelo aplicativo.
3. Distinguir observação, pedido, expedição, recebimento e ciência. Conservar
   documentos e comprovantes originais. Não declarar aceite de outra pessoa.
4. Ao retornar, consultar histórico, referência e intenção já persistida antes
   de criar outro registro. Recuperar a mesma tentativa de gravação ou emissão
   cujo resultado ficou incerto. Não apagar ready para abrir uma vaga.
5. Somente a pessoa autorizada reconcilia pelo fluxo correspondente. Importação
   histórica, quando aplicável, exige revisão, proveniência e dados conhecidos;
   não reconstruir autores/instantes desconhecidos como se fossem fatos atuais.
6. Conferir ausência de duplicação e os efeitos em documentos, ciência e
   movimentações. Conservar a ressalva sobre a origem em contingência.

## Incidente técnico ou de integridade

Guardar código seguro, correlação, referência técnica, ambiente e horário.
Não enviar payload clínico, senha, certificado privado, endpoint Push ou dump
por canal de suporte. Em Notificações, a equipe consulta o impacto próprio,
abre a origem e acessa Guias e ajuda. A administração do paciente orienta os
atos locais; o painel global técnico não concede acesso a esses atos.

Em Administração → Monitoramento e suporte, consultar o ambiente correto,
eventos e histórico; registrar acompanhamento e motivo técnico. Revisar uma
versão concorrente antes de alterar a política. Resultado incerto conserva a
mesma tentativa. Encerrar incidente não reenvia mensagens, recupera períodos,
produz ciência ou comprova que o problema foi resolvido fora do sistema.

Em integridade recusada, preservar o arquivo e a referência registrada e seguir
a recuperação autorizada. Não substituir bytes ou atualizar o hash para fazê-los
coincidir. Em suspeita de chave, seguir a política de custódia/denylist sem apagar
as emissões históricas. Não afirmar revogação ICP-Brasil, OCSP/CRL ou tempo externo
com base somente no provedor interno.

## Backup e retorno após perda de ambiente

O operador confere arquivo cifrado, manifesto, chave separada e recibo verificado.
Sete diários/quatro semanais são a política implementada; uma rotina externa
independente ainda precisa de ativação e ensaio próprios. Perder o computador
com a única chave impede recuperação, mesmo que os bytes da cópia existam.

Ensaiar restauração isolada, Auth, grants, Storage, hashes de PDFs e intenções,
progresso/outbox e custódia documental. Não habilitar cron ou egress na cópia
de ensaio. Segundos de um probe não provam RTO operacional8h ou RPO24h.
Restaurar o ambiente operacional exige o procedimento e autorização de D6;
este roteiro não autoriza reset, sobrescrita remota ou publicação definitiva.

## Registro dos gates humanos

| Gate | Estado desta entrega | Evidência ainda exigida |
| --- | --- | --- |
| Residência e atores reais | A designar | Cadastro e aceite dos responsáveis |
| Acesso e ciclo operacional | Pendente D-C | Ensaio pelos papéis autorizados |
| Documentos | Gate humano pendente | Conteúdo e confiança |
| Aparelhos/Push/AT | Pendente D-C/D6 | Prova física e assistência |
| Provedores | Sem aprovação | Configuração e homologação |
| Backup e chaves | Pendente D6 | Rotina e recuperação de custódia |
| RPO/RTO e restauração integral | Pendente D6 | Ensaio operacional mensurado |
| Disponibilidade | Prova externa pendente | Observador independente |
| Decisão de início | Pendente responsável | Exercício e decisão registrada |

Guardar decisão, autor, data, ambiente/versão e evidência no dossiê autorizado.
Não marcar o gate como aprovado por checklist preenchido ou teste automatizado.
Nenhum desses estados é alterado automaticamente pela preparação da residência.

## Fontes e execução comprovada

Os controles de preparação, responsáveis distintos, recuperação e bloqueio de
productionApproved=true já foram implementados em D3.5 e exercitados com Auth
real e navegador. Os hashes dos consumidores reutilizados precisam coincidir
com o [recibo do piloto](PILOT_EVIDENCE.json); evidência antiga não aprova uma
fonte alterada ou a CI atual. Este complemento documental não cria outro motor
de cadastro, obrigações ou homologação e não repete suítes funcionais inalteradas.

- [Preparação e guias D3.5](D3_5_EVIDENCE.json).
- [Operação e limites](OPERATIONS_DOSSIER.md).
- [Backup e retenção](BACKUP_PIPELINE.md).
- [Monitoramento e suporte](OBSERVABILITY.md).
- [Custódia e incidente de chave](SIGNING_CUSTODY.md).
- [Verificação pública](PUBLIC_VERIFICATION.md).
- [PWA](PWA_RUNTIME.md) e [Web Push](WEB_PUSH.md).
- [Ordem vigente](OWNER_EXECUTION_ORDER.txt).
