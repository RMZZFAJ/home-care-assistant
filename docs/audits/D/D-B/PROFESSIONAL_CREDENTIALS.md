# D3.17 — declaração profissional e conferência familiar

Implementado sobrec8c34f4, conforme P01 do
[adendo aprovado](../../C/C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md)
e contratos ID-02/ID-04. O titular informa nome, função, registro e UF no perfil.
Cuidadora sem registro aplicável pode conservar registro/UF vazios. Esses dados
não concedem capacidade, papel, habilitação ou validação por conselho.

## Conferência e histórico

Administração do paciente → Pessoas → Conferir credencial mostra a declaração
consultada. Administrador local ou familiar com access.manage confere outra
pessoa vinculada ao mesmo paciente; contexto global não basta. Resultado,
reconhecimento explícito e observação formam o comando; recusa exige motivo.
Autor, papel local e instante vêm do banco, nunca do navegador.

Mudança material de nome/função/registro/UF cria revisão, inclusive restaurar
um valor anterior. Preferências e no-op não fabricam revisão. A conferência
congela valor/hash/revisão; alteração pede nova conferência. Tentativa antiga
recebe409, sem rebase silencioso. Histórico tem vinte registros por página e
cursor composto; o teste lê20+2. Backfill registra captura técnica, sem alegar
a data histórica da declaração. externalValidation permanece null. Upload,
consulta a conselho e homologação externa estão adiados por P01.

## Recuperação e autorização

Perda de resposta mantém pacote/chave imutáveis por usuário/paciente/pessoa e
permite replay após reload, sem duplicar registro. Recusa comprovada conserva
campos. Armazenamento opcional indisponível é diagnosticado; referência local
corrompida bloqueia nova intenção automática. Falha de leitura oculta conteúdo
consultado e permite retry, sem aria-invalid em saída. Confirmar e fechar não
inventa alteração não salva.

API e RPC exigem Auth atual, contexto e capacidade do paciente. O banco
revalida depois de esperas reais. Autoaprovação, global sem vínculo, outro
paciente, sessão encerrada, revogação, revisão obsoleta e colisão de chave não
deixam conferência/auditoria parcial. Tabelas privadas com RLS não dão acesso
direto a anon/authenticated/service; helpers fechados, RPCs guardadas.
Metadata de perfil sem conferências acompanha exclusão autorizada do perfil;
conferências existentes conservam referências históricas. Papéis não mudam.

## Provas e contraprovas

Sete unitários passaram. Cinco casos Auth distintos passaram em coortes:
snapshot/replay/mudança-restauração; escopo/paginação/concorrência; cuidadora e
fonte externa proibida; sessão/vínculo após locks reais; exclusão local de
perfil sem histórico e JWT invalidado. Dez execuções Auth: sete PASS/três FAIL
conservadas, duas por cast de enum e uma pela whitelist do helper de locks.
Correções não reduziram negativas. A falha unitária inicial de BigInt para1.0
também permanece registrada; o schema rejeita antes da conversão.

Doze casos de produção passaram nos três motores: seis de credenciais e seis
consumidores anteriores do painel. Cobrem perda real de resposta após commit,
replay, leitura503 sem resumo privado, perfil próprio e409 sem rebase. Doze
scans320/390/768/1440 mantêm Axe/teclado. Não são aparelho físico, AT ou zoom
real400%. A mudança posterior de ref é renomeação textual comprovada, sem
repetir a coorte por esse motivo. O oráculo compartilhado recebeu validação
própria e de consumidores existentes após sua correção.

A CI da base apontou duas falhas adicionais. C026 foi reproduzido localmente:
rolagem após erro deixava conteúdo sob o cabeçalho. O produto centraliza o
campo inválido; o teste mantém Axe e exige posição/hit-test do campo. O oráculo
agora exige exatamente um main visível, preservando negativas inert,
aria-hidden, Tab bloqueado e dois main visíveis. Baseline com rota oculta
falhou; trinta controles sintéticos passaram. Resultados e fontes estão no
[manifesto](PROFESSIONAL_CREDENTIALS_EVIDENCE.json).

## Remoto e limites

Migrations158–161 aplicadas incrementalmente: declaração/conferências, cast do
papel, ciclo de vida auxiliar e índice FK. Local/remoto161, zero pendências.
[Recibo final](CREDENTIAL_REMOTE_MIGRATIONS.json) compõe a
[etapa160](CREDENTIAL_REMOTE_STAGE_160.json) com índice161. Histórico SQL,
funções/grants, RLS, trigger, backfill, índice válido e crons conferidos.
Diferença CRLF de duas funções históricas foi isolada na comparação, sem
reaplicar migrations ou alterar autorização remota.

[Advisors](CREDENTIAL_ADVISORS.json): segurança208 INFO43/WARN165;
desempenho166 INFO155/WARN11; zero ERROR. A nova FK sem índice foi corrigida.
RLS privado sem políticas mantém fechamento direto; duas RPCs SECURITY DEFINER
autenticadas são intencionais e guardadas. Índices ainda não usados refletem
ausência de carga remota; não foram removidos. Demais avisos anteriores não
recebem aprovação global. Links de remediação constam no recibo.

Sem backup/restore/comparação integral redundante do banco descartável, reset,
fixture/Auth remoto, envio externo ou promoção. PDF, certificado/TSA, backups
e monitoramento conservam seus dossiês. [CI base](CI_C8C34F4_OBSERVATION.json)
teve Chromium/agregador FAILURE; novo SHA exige CI própria. Sonar adiado pelo
responsável. PR7 Draft, sem merge. C7-AC-001/C-FINAL-AC-020 têm prova local;
humano/AT/aparelho, validação externa e D-C/D6 continuam gates próprios.
