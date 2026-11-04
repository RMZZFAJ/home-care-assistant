# Handoff C → D

**D NÃO INICIADA.** Planejamento não é autorização de implementação,
migration, envio, deploy, PR ou merge. Começar somente após a nova missão
explicitar fronteiras e ramo de decisões aprovado.

## Retomada de engenharia

1. Conferir git status/branch/HEAD e trabalho do responsável. Usar o commit C
   publicado como referência documental e comparar produto com o baseline
   funcional `37cb7f85e96e551d6419871f94dd950712e2565b`. Estado de produção
   deve ser verificado ao vivo; C não o homologou.
2. Ler portal/current/decisions e o lote D escolhido. Não refazer ingestão dos
   165 IDs ou as auditorias A/B. Crosswalk/causas/impacto indicam fonte e
   critério.
3. Fechar somente Pxx que condiciona o trecho: P02 ciência, P06/P07
   transferência, P14 COM, P15 revogação, P08/P12 retenção e
   P03/P04/P05/P10/P13 operação. Respostas futuras preservam data/autor/status
   e atualizam consumidores da decisão.
4. Conferir Node/npm, catálogo e guardas locais antes de qualquer teste
   mutável. Consentimento/backup para replay/fixtures; nunca usar remoto como
   suíte.
5. Escrever regressão com resultado correto e controle negativo. Probe antigo
   que confirma defeito não é aceitação desse defeito. Ler últimas definições
   SQL, não helper legado como se fosse entrada ativa.
6. Implementar incremento compatível, preservar fatos/ledger/autores/hashes e
   revisar API/RPC/RLS/grants/definer juntos. Usar lock/versão/intenção sem retry
   cego; confirmar read-back e ausência de efeitos quando negado.
7. Atualizar current só conforme implementação/prova real. Executar checks
   proporcionais e gates completos no candidato de release; não reutilizar
   verde de outro SHA/schema/config. Homologações humanas/remotas têm aceite
   próprio.

## Pacote de implementação por mudança

Usar [impacto de 121 causas](../C4-technical-design/CHANGE_IMPACT_MATRIX.csv)
para origem, consumidor, API/dados/evento e migration necessária. Os
[28 grupos de requisito](../C4-technical-design/APPROVED_CAPABILITY_CHANGE_PLAN.csv)
não são novos achados; ligam DEC/O a contrato e aceite. C3 é fonte de
tela/campo/mensagem/estado; C4 de esquema/compatibilidade/segurança; C5 de ordem
e gates. A [matriz de 149 critérios](ACCEPTANCE_CRITERIA_MASTER.csv) reúne
resultados positivos/negativos, camadas e limites. IDs podem compartilhar
teste, sem duplicar execução por nome.

Preservar: paciente como unidade, identidade global/local distintas, REQ sem
quantidade pedida, saldo por ledger, ciência/acesso/recebimento separados,
aceite físico pessoal, novo reconto autoral, histórico imutável, chaves
estáveis e estado uncertain externo. Não remover controles para destravar
exceção.

## Primeiros lotes e condições

D0 trata oráculos/readiness/guardas e ambiente; D1 os dois P1 e integridade.
D2 completa processos e responsabilidade; D3 edição/listas/estados; D4 PDFs/
arquivos/verificação; D5 PWA/push; D6 gates reais/restore/guias/liberação.
D7 exige autorização de canal; D-LATER não vira limpeza automática. Detalhes
de entrada/saída/dono/QA estão em C5, sem cronograma fictício.

Antes de operação: fonte de dados real separada, Auth/Storage/config e schema
compatíveis, restore em destino isolado com quarentena, contingência e donos,
AT/aparelhos/impressão, PWA/push prometidos e aceite da família/equipe. Sem
isso, NO-GO. Backup com TOC não basta e restore não pode reenviar jobs
antigos.

## Caminhos históricos e instrumentos

Consultar [mapa](../../../RELOCATION_MAP.csv) e resolver C6. Não reexecutar
scripts B em nova localização como se fossem verificadores atuais: alguns
contêm destino/base fixos, fixtures, mutações ou publicação por token. Raw
evidência/manifesto não são recalculados para acomodar o novo endereço. D0
repara ferramenta reutilizável somente após destino/efeito/consumidor
explícitos.

O commit C e a ref remota serão a evidência de publicação documental. Preview
automático autorizado pode ocorrer sem ser deploy deliberado ou homologação
produtiva; configuração de provedor permaneceu preservada.
