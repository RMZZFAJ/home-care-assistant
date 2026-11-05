# Banco, reinicialização e entrada em operação

Este documento é um plano revisável para a Fase B. Não foi executado reset,
migration, fixture ou provisionamento no remoto. A autorização desta Fase A
cobre apenas o ambiente local de desenvolvimento/testes existente.

## Situação demonstrada

A cadeia de 84 migrations passou em instalação limpa e evolução a partir das
19 históricas, com registros legados, hashes, protocolos e quantidades
preservados pelos asserts. As 14 suítes SQL e 33 integrações com Auth real
passaram. Isso comprova caminhos locais; não reconcilia automaticamente
configuração, dados, Auth, Storage ou cron de um projeto remoto.

O banco local foi reconhecido por projeto, portas e labels dos containers.
O replay autorizado substituiu dados fictícios. O script existente exigia
backup: foi usado o dump local já existente de 25/10, com manifesto e hash
validados pelo próprio guard. Não foi criada outra stack nem carregado dado
de teste no remoto. Os logs identificam API 127.0.0.1:54321 e envio externo
falso.

## O que significa começar limpo

Limpar dados de desenvolvimento e preservar história legítima são decisões
distintas. O primeiro paciente operacional pode começar sem documentos de
teste, mas o schema deve continuar reproduzível pela mesma cadeia imutável.
Um novo projeto limpo, quando autorizado, reduz a ambiguidade de dados antigos;
reutilizar o projeto existente exige inventário e plano explícito de retenção.
Não escolher o destino apenas pelo vínculo atual do CLI.

- Superfície: PostgreSQL; Preparação para produção: 84 migrations + correções
  incrementais aprovadas; grants/RLS finais; O que não transportar
  automaticamente: Dados E2E, pacientes e eventos sintéticos
- Superfície: Auth; Preparação para produção: Identidades reais por API oficial,
  e-mails confirmados e recuperação funcional; O que não transportar
  automaticamente: Senhas de fixtures, usuários example.invalid, hashes manuais
- Superfície: Perfis e vínculos; Preparação para produção: Global explícito;
  administrador por paciente; funções e capacidades revisadas; O que não
  transportar automaticamente: Flags de navegador, permissões derivadas de nome
  ou metadata
- Superfície: Catálogo; Preparação para produção: Identidades canônicas e adoção
  por paciente após revisão humana; O que não transportar automaticamente:
  Pressupor que o seed inteiro é catálogo final da residência
- Superfície: Estoque; Preparação para produção: Contagem inicial conferida e
  lançamentos com origem/justificativa; O que não transportar automaticamente:
  Saldo legado atribuído a custódia sem evidência
- Superfície: Storage; Preparação para produção: Buckets privados, políticas e
  objetos necessários reconciliados; O que não transportar automaticamente:
  Anexos/fotos/PDFs de testes e URLs assinadas antigas
- Superfície: Configuração; Preparação para produção: Políticas por paciente,
  fuso, BAL, ciência e notificações revisadas; O que não transportar
  automaticamente: Preferências e exceções sintéticas herdadas
- Superfície: Cron/Vault; Preparação para produção: URL, segredo, job e execução
  comprovados no destino; O que não transportar automaticamente: Segredos locais
  e jobs apontando para outro ambiente
- Superfície: Meta/SMTP/OAuth; Preparação para produção: Configuração e aceite
  próprios por provedor; O que não transportar automaticamente: Considerar
  contrato local como entrega externa comprovada

O seed atual ajuda a reproduzir o catálogo de referência; não substitui uma
revisão de nomes, unidades-base, apresentações, códigos de barras, aliases,
limiares e itens ativos de cada paciente. O cenário Clezeide fornece dados e
políticas locais, não constantes no código para todos os pacientes.

## Sequência proposta e pontos de parada

1. Escolher destino e estratégia: novo projeto ou saneamento autorizado do
   existente. Registrar project ref, conta, organização, branch/SHA e dono da
   decisão. Inventariar dados a preservar, inclusive Auth e Storage.
2. Fazer backup do ambiente correto, com manifesto, hashes e inventário de
   objetos. Ensaiar restauração completa em destino separado autorizado para
   recuperação, sem apontar a suíte mutável ao remoto.
3. Reconciliar migrations e schema final; executar dry-run. Aplicar somente
   incrementos aprovados. Nunca editar arquivos históricos para obter igualdade.
4. Criar/confirmar a identidade administrativa inicial por Auth oficial.
   Vincular a identidade global ao perfil de forma controlada. Validar login,
   recuperação, MFA quando exigido e proteção do último administrador.
5. Cadastrar paciente, administrador local e segundo responsável de recuperação.
   Convidar familiares, supervisão, profissionais e leitores com mínimo acesso.
   Comprovar aceite destinado à pessoa correta e isolamento entre pacientes.
6. Revisar catálogo e saldo inicial por custódia; registrar os movimentos e a
   contagem com autoria, data, justificativa e documentos de origem.
7. Definir políticas de ciência, revisão, escalas e BAL com a família/equipe.
   Publicar escalas reais antes de ativar obrigações por plantão. Testar falta
   de cobertura, substituição, adiamento e conflito sem aprovação cega.
8. Habilitar operação interna após aceite das correções bloqueadoras e das
   jornadas. Registrar contingência manual com foto/documento físico e
   reconciliação posterior; não transformar relato em débito automático.
9. Configurar agendamento e monitorar primeira execução, atraso e repetição.
   Habilitar canais externos separadamente, após consentimento, templates,
   telefone, webhook, chaves e testes de entrega/leitura/aceite.
10. Fazer smoke autenticado por papel no SHA publicado, com dados autorizados,
    logs mínimos e plano de rollback da aplicação. Schema evolutivo pode exigir
    correção para frente; não prometer reversão destrutiva de migrations.

Cada etapa tem responsável técnico e aceite operacional. Se identidade,
destino, restauração ou saldo inicial não estiverem comprovados, parar antes
do respectivo passo mutável. Este plano não concede autorização futura.

## Continuidade, retenção e recuperação

Os documentos históricos registram ensaio de restauração local em etapa
anterior e backups remotos sequenciais, com limites explícitos. Não há nesta
Fase A ensaio atual de recuperação integral do destino de produção incluindo
Auth, bytes do Storage, configurações e jobs. **OPS-001** registra essa lacuna
de aceite; não afirma que os backups existentes são inválidos.

Backup de banco não inclui os bytes dos objetos do Storage. Um manifesto deve
ligar metadados, objeto, hash e versão. O runbook precisa definir RPO, RTO,
retenção, acesso ao backup, responsável e um teste de restauração que termine
com login, documento/PDF, anexo e estoque conciliado. Essa separação consta na
[documentação oficial de backups do Supabase][backups], consultada em 27/10.

Em indisponibilidade, usar registro manual/foto com data, autoria, materiais e
quantidades pertinentes à entrega/contagem. Ao recuperar, conferir duplicatas,
protocolos e custódias antes de importar. REQ continua sem quantidade
solicitada.
Nenhum canal alternativo pode presumir recebimento ou dispensar consentimento.

[backups]: https://supabase.com/docs/guides/platform/backups
