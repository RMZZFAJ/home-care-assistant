# D3.22 — inteiros, códigos, unidades e desafios de acesso

O campo Ordem do catálogo não tinha os limites já exigidos pela API. Baseline
real confirmou que -1 era aceito pelo navegador. O campo agora exige inteiro
entre0 e1.000.000; o componente compartilhado apenas recebe min/max/step
opcionais. Os demais consumidores conservam seus valores e comportamento.
Autorização e validação do servidor permanecem iguais.

## Provas locais

Três cenários distintos Chromium de produção e22 testes unitários passaram.
Tipos e lint dos arquivos afetados também passaram. A CI programada executa
os mesmos cenários nos demais motores; não se alega execução local deles.

- Catálogo rejeita ordem negativa, fracionária e acima do limite;12 é gravado
  por HTTP e confirmado no PostgreSQL. Nome livre permanece texto.
- Unidade preserva código001234, nome, dimensão e âmbito do paciente. Precisão
  aceita0/6 e recusa negativos, fração e7. API recusa tipo textual na precisão,
  código numérico, dimensão desconhecida e criação global pelo administrador
  local. Estoque permanece igual antes/depois.
- O código da apresentação mantém001234 como texto sem retirar zeros; seis
  algarismos são inválidos no contrato existente de8–14. O código válido
  00123456 é gravado pela interface e reconsultado por HTTP com os zeros.
  O teste não transforma a amostra de seis dígitos em apresentação válida.
- Turno de19:00 com720 minutos termina às07:00 do dia seguinte. Fração na
  duração é recusada; não há segundo fim editável. Intervalo persistido e data
  local são conferidos; conflito de agenda continua409 e o calendário móvel
  anterior mantém sua prova no cenário existente.
- Login usa current-password sem aplicar a política de nova senha. Alteração
  usa current-password e new-password com mínimo12. Um fator TOTP real é
  cadastrado/verificado no Auth local, sem QR no navegador do teste. Novo
  login AAL1 exige a etapa adicional em Meu perfil. Campo OTP é textual com
  teclado numérico, padrão de seis algarismos e one-time-code; conserva zeros,
  rejeita comprimento curto e fica vazio após reload. Fator criado é removido
  no finally; fatores anteriores não são removidos.

O teste Auth desliga trace, vídeo e screenshots. Segredo e código de ativação
ficam somente na memória do processo; não há gravação em evidência, rascunho,
log ou navegador. Os valores de demonstração digitados não são enviados para
validar um desafio. Não houve troca de senha, envio externo ou Auth remoto.

## Contraprovas e qualificação

Além da falha real do baseline, logs preservam três ajustes do instrumento:
select com opções exige seletor por papel acessível; material da apresentação
usa busca existente; a fixture Auth requer paciente explícito para atuação
local, e conta com MFA redireciona para a etapa adicional. Não se mudaram
produto ou guardas para contornar essas recusas.

O log anterior ao ajuste de redirecionamento contém os dois cenários Chromium
de catálogo/agenda aprovados. A última mudança afeta somente o destino esperado
do helper para o caso MFA; o default dos outros dois e o produto são iguais.
O caso MFA passou separadamente na fonte final. Os testes dos três projetos
continuam incluídos na CI; nenhum caso foi excluído ou marcado skip.

[Manifesto](TYPED_FIELDS_EVIDENCE.json),
[reconciliação remota read-only](TYPED_FIELDS_REMOTE_OBSERVATION.json) e
[observação do SHA anterior](CI_9B8260E_OBSERVATION.json). Local/remoto164,
zero migrations novas ou pendentes; sem reset, seed/Auth remoto ou backup
redundante. C-FINAL-AC-019 fica parcial: os casos descritos têm prova local;
reconciliação dos demais grupos finitos de decisão/linhas/capacidades permanece
no critério composto. CI do próprio SHA, AT, aparelhos físicos e demais gates
D-C/D6 continuam separados. PR7 Draft,
Sonar adiado, produção preservada e meta D-B ativa.
