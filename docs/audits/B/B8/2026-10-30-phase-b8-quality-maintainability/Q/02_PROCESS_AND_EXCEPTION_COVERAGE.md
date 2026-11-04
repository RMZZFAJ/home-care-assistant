# Q2/Q4 — Processos, pessoas e situações excepcionais

A [matriz por processo](../evidence/PROCESS_TEST_COVERAGE.csv) contém os 17
domínios requeridos, comportamento esperado, checks existentes, método,
referência e limite. A [matriz por pessoa](../evidence/ROLE_TEST_COVERAGE.csv)
separa seis perspectivas. Os [22 cenários
excepcionais](../evidence/EXCEPTION_TEST_COVERAGE.csv) identificam onde uma
prova é forte e onde um caso vizinho não basta. As 66 jornadas B2 são
referência, não foram repetidas.

## Cobertura que deve ser preservada

REQ tem testes de origem/corpo antes da escrita, exclusão de rótulos do cliente,
snapshot persistido, idempotência e resposta perdida com total1 e mesmo ID.
COM/ENT têm leitura de custódias e estados: aquisição não abastece, validação
credita FAMILY, expedição usa TRANSIT e aceite positivo atende a linha REQ. BAL
novo exige pessoa/plantão/referência reais, revalida versão e recupera
criar/revisar/submeter após fechamento da atribuição.

A barreira de `balance-idempotency.test.mjs` espera duas transações HTTP no lock
antes de liberá-lo. Isso demonstra sobreposição independentemente do lock de
refresh do SDK. Últimos administradores, saldo insuficiente, concessão delegada
e isolamento A/B possuem provas com Auth real. Não substituir essas provas por
mocks de capacidade ou assertions de botão oculto.

O consumo exige revisão antes do débito; ciência e atendimento são medidos
separadamente. Realtime privado tem teste de duas sessões e negativa de outro
usuário. Mailpit, TOTP e fixture de telefone confirmado exercitam contratos
locais legítimos, sem provar SMTP/OAuth/SMS ou posse de telefone físico.

## Lacunas que um happy path não protege

- Cancelar ENT com consumo real é outro ramo do cancelamento com devolução
  integral. DB-001/B3-002 permanece reproduzido nas auditorias, sem correção.
- Receber COM parcialmente não fornece decisão formal sobre seu remanescente.
  Tampouco identifica automaticamente cada parcela no snapshot, B3-010/B6-010.
- Revisão distinta no BAL novo não protege o legado com autoaprovação, nem
  substituição durante reconto ou rejeição de adiamento obsoleto.
- Retry REQ não protege chaves de settings, link de convite, reserva de anexo,
  associação de avatar ou transação composta Auth/telefone.
- Documento atualizado ao vivo não prova que consumo, Flow e fila admin
  recarreguem após a mesma invalidação. Emissão e consumo do sinal são causas
  distintas, conservadas separadamente na matriz de regressões.
- Arquivo válido pequeno não cobre teto de ingresso remoto, reservas
  abandonadas, anotação visível removida ou comparação dos bytes do cache.
- Menu por capacidade não comprova a matriz de todas as rotas diretas. B4-008
  mostra por que duas rotas equivalentes precisam do mesmo ator no caso.
- Um registro recente não protege o 101º relato/evento nem a proposta pending
  além do corte de 50; ausência na lista não significa ausência persistida.

## Isolamento e validade da fixture

Setup controlado por SQL cria pacientes, vínculos e saldos fictícios; a operação
sob investigação é então chamada com Auth/RPC/UI. Isso é válido como
pré-condição declarada, sem provar que todo estado inicial seria criado pela
interface. O bootstrap privilegiado não serve como prova de autorização do
usuário. Nenhum novo estado impossível foi confirmado pela B8.

Os helpers preservam eventos e identidades anteriores. Isso protege histórico,
mas exige seleção de fixture por identidade e origem, não por ser o primeiro
item de uma fila compartilhada. Claims podem alterar jobs locais alheios ao caso
até achar sua fixture; por isso não executamos integração no banco de
desenvolvimento preservado para avaliar cobertura.

Fixtures, tokens e contexto compartilhados entre testes justificam execução
sequencial. CI efêmera reduz interferência, sem eliminar corrida de prontidão de
UI. Data real, fuso e virada de dia são hipóteses de instabilidade ainda não
medidas; não receberam gravidade de defeito confirmado.

## Segurança dos processos e privacidade

O oráculo futuro deve conservar estas fronteiras: REQ não define quantidade de
compra; compra não significa recebimento validado; expedição não é aceite;
ciência não comprova fato material; relato não é débito; escala não é presença;
contagem não é aprovação; PDF não substitui fonte histórica ou assinatura.

Testes de permissão técnica não decidem base legal, retenção, exclusão,
responsáveis, acesso administrativo excepcional ou contingência. B3/B6/B7
fornecem limites técnicos; avaliação específica do controlador e aceite humano
continuam necessários. Não foi identificada nova função clínica direta que
justifique iniciar outro domínio regulatório nesta B8.
