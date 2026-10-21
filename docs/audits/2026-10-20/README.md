# Auditoria de 20/10/2026

A missão mestre é a especificação principal. Os dois prompts anteriores são
fontes históricas; diagnósticos antigos são confrontados com evidências atuais.
As decisões posteriores do usuário sobre administração, catálogo por paciente,
saldo negativo, atualização de versões e preservação prevalecem sobre os anexos.

- [Checkpoint](CHECKPOINT.md): estado preservado, decisões e próximas ações.
- [Execução](EXECUTION.md): comandos, ambientes, resultados e limites.
- A matriz REQUIREMENTS.csv/json contém estados inicial/final, localização,
  evidência individual, escopo validado, lacunas, prioridade e critérios de aceite.
- SOURCE_REQUIREMENTS.json preserva 187 seções com os critérios completos
  das três fontes; a matriz consolida 74 requisitos operacionais.

A geração da matriz não transforma aprovação de uma área em aprovação de
todos os requisitos. Somente IDs aceitos explicitamente em
verification.json.validatedRequirementIds recebem estado validado. Evidência
relacionada e evidência suficiente para aceite são conceitos distintos.

## Limites da etapa inicial

Nenhuma alteração remota, envio real, commit, push, merge ou deploy.
Testes usam somente dados fictícios e ambiente descartável previamente verificado.
Código, banco, UI e permissões devem ser verificados conjuntamente para aceite.

As duas primeiras linhas descrevem a autorização vigente em 20/10.
As [decisões de 21/10](../2026-10-21/AUTHORIZATION.md) passaram a permitir
atualização remota, commits e push, com PR/merge condicionados à prontidão,
e adotaram o projeto local existente como ambiente de desenvolvimento e testes.
