# Autorizações vigentes

## Escopo aprovado

Em 21/10/2026, o usuário pediu continuidade integral da execução e2e e
incorporou as seguintes decisões:

1. Investigar a recorrência de falhas de permissão do Supabase CLI, incluindo
   identidade, instalação, armazenamento de credenciais e destino do projeto.
2. Utilizar o banco local home-care-assistant como desenvolvimento e testes,
   atualizar sua cadeia e remover a exigência de criar outro banco para a suíte.
3. Atualizar também o banco remoto correto depois de resolver o acesso e validar
   a cadeia incremental e seus efeitos.
4. Fazer commits e push em blocos lógicos, preservando histórico e trabalho
   existente. Abrir PR e fazer merge se pronto; caso contrário, informar faltas.
5. Excluir a branch de trabalho somente depois de sua integração segura.

Essas decisões substituem as limitações anteriores de somente consulta remota
e ausência de commits/push/merge. Os registros datados de 20/10 preservam os
limites e fatos daquela etapa.

## Proteções mantidas

- Preservar os commits 7f79ebb e fc04de4 e todas as alterações anteriores.
- Não reescrever migrations já aplicadas; acrescentar migrations incrementais.
- Confirmar organização, identidade e projeto antes de aplicar no remoto.
- Não inventar associações de dados legados sem origem comprovada.
- Testes com reset e fixtures limitam-se ao banco local, com destino verificado
  e proteção dos dados locais antes da substituição.
- Nunca executar reset remoto, fixtures remotas ou promover usuários de teste
  a contas de operação.
- Não publicar segredos, dados clínicos, traces ou backups no Git.
- Declarar implementado, testado, parcial e bloqueado com evidências distintas.

O pedido de correção da autenticação não autoriza associar o repositório a
outro projeto apenas porque a conta atual consegue acessá-lo. O destino deve
ser o projeto correto e a conta deve possuir o acesso necessário.
