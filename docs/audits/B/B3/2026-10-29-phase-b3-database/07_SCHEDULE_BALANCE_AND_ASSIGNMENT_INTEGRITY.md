# Escalas, BAL e responsabilidades

## Prova e garantias preservadas

11 cenários B37 executados em novo paciente fictício, incluindo Auth real,
leitura independente, fixture transacional de semanas anteriores e simulação
futura com rollback. Agenda mantém instantes UTC e timezone; exclusão GiST
por profissional cobre todos os pacientes com intervalo fechado/aberto [início,
fim). Conflito entre pacientes retornou somente schedule overlap/23P01,
desfez a série inteira e não expôs dados da outra residência. Plantão adjacente
foi permitido. Agenda não demonstra presença ou contagem física efetiva.

Ativar BAL explicitamente criou obrigação e atribuição no plantão real; pessoa
não designada e administrador sem identidade de contador foram recusados.
Mudança de horário de atribuição ativa exigiu decisão familiar de adiamento;
gestão da agenda não ganhou esse poder implicitamente. Configuração de tipo
afeta séries futuras, enquanto ocorrências persistidas conservam intervalos.

Contagem required capturou política e revisão do ledger. Recebimento posterior
invalidou a aprovação restante. Reconto incrementou countVersion, conservou
aprovação antiga e exigiu aprovações novas. Uma versão anterior não aprovou a
nova contagem. BAL reconciliador continua referência bal, não consumption.

B37-06 inseriu três obrigações antigas novas numa fixture com rollback,
usou sessão Auth real do contador e chamou a RPC atual. Resultado: uma semana
counted e três regularized, mesmo instante real de contagem, três atrasos
anteriores preservados. Rollback devolveu a atribuição original. Isso prova a
regra nesse estado reconstruído; não prova ativação retroativa permitida nem
espera real de semanas. Ativação retroativa pela API continua proibida.

## Revisão e mudança de pessoa

B2-009 foi revalidado: supervisor no regime anterior aprovou a própria contagem
required. O guard de identidade distinta examina balanceContext, ausente nesse
regime. No regime por plantão a tentativa equivalente retornou 42501.
A interface esconder autoaprovação não fecha a RPC direta do regime anterior.
Uma correção futura deve preservar revisão legítima e explicitar a política
de independência em ambos os regimes, sem apagar aprovações antigas.

B2-014 foi revalidado: substituição na mesma janela durante reconto de ciclo
counted invalidou atribuição e deixou eligibility.assignment nulo. O scheduler
sai do ciclo counted antes de criar sucessor. O revisor recuperou com
assign_recount; substituto recontou mantendo created_by original e registrando
a identidade efetiva em balanceContext. O autor original pôde revisar a nova
contagem feita por outra pessoa: independência deve considerar quem contou,
sem reescrever autoria histórica. Não há perda definitiva do documento.

## Adiamento obsoleto

B2-012 foi revalidado: mudar somente uma nota/version do plantão destino deixou
pedido pending após refresh e impediu inclusive sua rejeição. O processamento
encontra origem ainda válida e sai antes de limpar destino obsoleto; a decisão
revalida destino mesmo quando approve=false. Aprovar destino desatualizado é
corretamente recusado, mas falta terminar a pendência sem contar ou invalidar
a origem. Não alterar o prazo original para contornar essa lacuna.

## Corte de série e consequência adicional

B37-03 revalida DB-003/B2-013: propor três plantões, encerrar a partir do
segundo e aprovar a versão atual restaurou os três como published, mantendo
ended_on. Aprovação não limita ocorrências pelo corte. A UI atual restringe
essa sequência, mas a API/RPC aceita. A garantia do banco deve considerar essa
entrada; não basta esconder o botão.

B37-11 amplia a prova anterior: process_bal_patient com p_now futuro na
mesma fixture criou atribuição BAL numa ocorrência republicada além do corte.
Foi rollback e simulação temporal, sem presença, nova contagem ou espera real.
É manifestação adicional da mesma causa, não um segundo achado independente.
O resultado mostra que a agenda incoerente pode produzir responsabilidade
operacional derivada, além de aparecer incorretamente na consulta.

## Limites e decisões futuras

Definir terminalidade do corte e se alguma aprovação parcial anterior a ele
deve ser permitida; nenhuma ocorrência além do corte pode ressurgir por retry.
Definir saída para adiamento obsoleto e comunicação ao revisor quando não há
contador executável. Não converter escala em presença, reconto em consumo ou
aprovação antiga em assinatura de nova versão.

Fusos arbitrários e mudanças históricas de horário de verão não foram testados
em execução B37; o SQL usa pg_timezone_names/AT TIME ZONE e intervalos reais.
Validação humana da agenda e da decisão informada permanece B1/UX-001.
Concorrência forçada, locks de recuperação e revogação em voo seguem B3.8.
Nenhuma tabela, trigger, função ou migration do produto foi alterada.
