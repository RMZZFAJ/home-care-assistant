# Etapa e conteúdo do rascunho privado

## Lacuna e comportamento

C-NEW-AC-014 já tinha conteúdo privado tipado, isolamento por dono/tipo/alvo,
CAS, comparação e recuperação de intenção. Faltava preservar a etapa: todos
os consumidores retomavam o primeiro passo. A migration153 acrescenta somente
navigation nullable em private.creation_drafts, separada de content/contentHash.
Não reescreve linhas existentes, protocolos, documentos, eventos, PDF ou estoque.

navigation contém version=1 e uma etapa de lista fechada, validada na API e no
banco por tipo/finalidade e pelo modo BAL. Não contém papel, dono, capacidade
ou identidade operacional. Os comandos existentes conservam suas assinaturas,
grants, locks, CAS e hash de intenção. A chave idempotente também vincula a etapa.
Cliente antigo pode omitir o campo; seu novo save limpa somente a etapa anterior.

REQ, COM/ENT, BAL legado e BAL agendado retomam a etapa salva após a adoção
explícita. Conferência e divergência ENT conservam suas finalidades próprias.
Draft sem etapa continua legível, anuncia a ausência e retoma o início.
Consumido ou descartado não expõe etapa nem conteúdo privado na consulta.

O resumo tipado é de leitura, com etapa da versão exibida, versão base da ficha,
referência de estoque BAL e ausência explícita de política base preservada.
Não apresenta regras atuais como se estivessem congeladas no rascunho.
Referências de ficha/plantão/estoque e permissões continuam revalidadas antes de
retomar/confirmar. A etapa não concede permissão nem confirma dados incompletos.
Uma recuperação usa a etapa do pacote original, mesmo após reload ou nova edição.

## Verificações e fechamento

Passaram16 unitários selecionados e30 casos Auth reais, sem falhas. A coleta
inicial ignorou o novo arquivo .test.tsx por configuração explícita .test.ts;
ele foi convertido e os cinco casos novos passaram, sem mudar o filtro.
Cinco cenários de diagnóstico Next dev passaram; são uma coorte separada.
A coorte final de produção, a reconciliação remota e seus resultados estão em
[evidências](DRAFT_NAVIGATION_EVIDENCE.json), sem aproveitar Next dev como produção.

[Preflight remoto](DRAFT_NAVIGATION_REMOTE_PREFLIGHT.json) verifica backup
cifrado, restauração isolada, upgrade152→153, identidades/grants existentes,
histórico SQL, estado, locks e compatibilidade. As diferenças conhecidas do
restore são o alias redundante da view de scheduler e o flag de validação de
presentation_finite_factor local; nenhum predicado é reduzido.
No pós-DDL, a comparação das linhas antigas remove somente a nova coluna
navigation, exige seus valores antigos NULL e conserva todos os demais campos.
O registro novo do histórico de migrations é conferido separadamente.

Backup/probe não comprovam recuperação operacional D6, RPO/RTO, homologação
humana, tecnologia assistiva ou aparelho físico. PDFs mantêm foco técnico;
a reformulação de aparência permanece com o responsável. Sonar está adiado.
PR7 permanece Draft e produção NO-GO. Esta entrega não conclui toda a D-B.
