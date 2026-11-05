# ORDEM COMPLEMENTAR — FECHAMENTO DEFINITIVO DA FASE C

## HOME CARE ASSISTANT

POLÍTICA DE CIÊNCIAS, REVISÃO PROFUNDA DA C8 E CONSOLIDAÇÃO FINAL

Continue o trabalho na branch `audit/phase-b`, vinculado ao **Draft PR #6**,
destinado à `master`.

As subfases C0–C10 já foram executadas. Esta missão não deverá repeti-las, mas
**incorporar as últimas decisões expressas do responsável, corrigir
integralmente as inconsistências remanescentes das especificações visuais e
aprofundar tudo que ainda esteja insuficiente para orientar a Fase D**.

A execução deverá ser crítica, abrangente e orientada à qualidade real das
especificações, não apenas à validação sintática dos documentos.

## I. DECISÕES DEFINITIVAS SOBRE CIÊNCIA — P02

O responsável aprovou expressamente a seguinte política.

**SCI-001 — Ciência expressa no aplicativo:** manter.

**SCI-002 — Ciência automática por exposição do cabeçalho:** substituir por
confirmação mediante diálogo antes da abertura, conforme a decisão já
documentada.

**SCI-003 — Leitura pelo WhatsApp:** preservar como evidência de comunicação,
sem equivalência automática com ciência. O canal permanece postergado.

**SCI-004 — Confirmação pelo WhatsApp:** preservar como possibilidade futura
de confirmação expressa identificada, condicionada à homologação externa.

**SCI-005 — Ciência pela expedição de ENT vinculada à REQ:** manter como
**regra obrigatória, permanente e não configurável do sistema**.

### Regra obrigatória SCI-005

A emissão/expedição efetivamente concluída de uma ENT vinculada a uma REQ
deverá produzir o registro de ciência correspondente ao responsável
autenticado pela expedição, observadas as regras de identidade e autorização.

A SCI-005:

- Não pode ser desativada por profissional, familiar, administrador familiar
  ou administrador global.

- Não pode depender de preferência individual que permita sua desativação.

- Não pode ser disparada pela criação, edição ou gravação de rascunho.

- Deve ocorrer exclusivamente na transição oficial de expedição concluída.

- Deve considerar quem efetivamente executou a expedição, não presumir que
  seja o criador original do rascunho.

- Deve identificar a REQ vinculada, a ENT, o ator, a versão e o instante.

- Não representa recebimento físico nem confirmação de consumo.

- Não concede permissão de ciência a usuários que não possuam autorização para
  representar a família.

- Deve preservar eventos anteriores e impedir duplicações por repetição
  técnica.

**Atenção:** verifique especificamente a implementação atual de
`scienceByDispatch` e a condição que compara o usuário autenticado com
`created_by`.

A especificação futura deve substituir a dependência de configuração mutável
por uma invariável efetivamente imposta pelas regras de negócio.

Não altere o banco ou o código nesta missão; descreva a alteração necessária
para a Fase D.

### Governança da ciência familiar

O administrador familiar define quais usuários possuem a capacidade de
registrar ciência em nome da família.

Quando houver vários usuários habilitados:

1. Cada ciência pessoal poderá ser registrada individualmente.

2. O histórico preservará identidade, instante, modalidade e referência
   documental.

3. **A ciência válida de qualquer um dos usuários autorizados satisfará a
   obrigação familiar.**

4. Para a equipe, o estado agregado será **“Família ciente”**.

5. O sistema não exigirá ciência de todos os familiares autorizados.

6. Não haverá gestão obrigatória das comunicações internas entre familiares.

A responsabilidade pela concessão das permissões pertence à administração
familiar, sem transformar automaticamente essa regra operacional em conclusão
jurídica sobre responsabilidade civil.

### Três modalidades configuráveis

Mantenha:

- Manual expressa.

- Automática mediante diálogo de confirmação antes da abertura.

- Tácita por preferência anterior e expressa, quando permitida.

A configuração poderá variar por tipo de obrigação elegível, respeitando as
regras administrativas aplicáveis.

A SCI-005 deverá permanecer independente e obrigatória, não integrando as
opções que permitem desativação.

Abertura de documento, ciência, envio de mensagem, leitura de mensagem e
recebimento físico são acontecimentos distintos.

### Requisições modificadas

A orientação de produto é preservar a imutabilidade do conteúdo material da
REQ após sua emissão.

Verifique no código e nos contratos se atualmente existe algum caminho
autorizado para alteração material posterior.

Diferencie alteração do conteúdo original de atualização de estado,
atendimento, vínculos, ciência e histórico.

Não crie uma nova função de edição apenas para justificar o tratamento de
versões.

Se houver alteração material autorizada:

- A ciência da versão anterior permanece no histórico.

- A nova versão exige ciência própria.

- A apresentação agregada retorna a pendente até nova satisfação.

- Os responsáveis recebem notificação pertinente.

- Os eventos anteriores não são apagados ou reescritos.

Reemitir PDF sem alteração material não deverá invalidar ciência.

### Entregáveis P02

Atualize o inventário `SCI-001–SCI-005`, os documentos canônicos de decisões,
a especificação REQ, os contratos técnicos e os critérios de aceitação
relacionados.

Registre **P02 como `OWNER_APPROVED`**, mantendo eventuais questões
estritamente técnicas identificadas para a Fase D.

Não mantenha a classificação `OWNER_REVIEW_REQUIRED` para escolhas que foram
expressamente respondidas nesta ordem.

Não apresente a SCI-005 como funcionalidade opcional.

## II. PENDÊNCIAS DE FORNECEDORES, CUSTOS E CONTRATAÇÕES

O responsável determinou que pesquisas comerciais, comparação de fornecedores,
precificação e recomendações de contratação serão realizadas externamente por
ele com o ChatGPT.

**Não execute pesquisa comercial de fornecedores, certificadoras, serviços de
assinatura, backup, monitoramento ou preços nesta missão.**

Isso se aplica especialmente a P03, P09 e P13.

Mantenha o estado canônico **`OWNER_APPROVED_SCOPE_PENDING`** quando o
objetivo estiver aprovado e restarem parâmetros, fornecedores, custos ou
condições operacionais.

Preserve `PENDING_OWNER` somente para escolhas que efetivamente ainda dependam
de aprovação humana.

Não utilize `OWNER_REVIEW_REQUIRED` para decisões já tomadas.

Não invente valores, contratos, fornecedores, prazos de serviço ou garantias.

### Impacto sobre a Fase D

Registre expressamente que P03, P05, P07, P08, P09, P10, P13, P15, OPS-01 e
PERF-01 **não impedem o início geral de D0 e dos trabalhos independentes de
D1**.

Entretanto, identifique os gates específicos de implementação e homologação:

- P03: recuperação e liberação operacional D6.

- P05: procedimentos excepcionais e responsabilidades.

- P07: substituição segura da devolução por transferência.

- P08: políticas de retenção e exclusão.

- P09: implementação/homologação da assinatura criptográfica D4.

- P10: homologação física D6.

- P13: alertas e monitoramento D5/D6.

- P15: revogação e transporte de arquivos D1/D4.

- OPS-01: mecanismos legados de agendamento.

- PERF-01: desempenho e metas de aceitação.

Nenhum gate poderá ser declarado aprovado apenas porque sua documentação está
completa.

A abertura da branch D, conforme a estratégia aprovada, continua dependendo da
integração prévia do PR #6 à `master`.

## III. REVISÃO INTEGRAL E PROFUNDA DA C8

Execute uma revisão semântica completa da especificação visual.

**Não se limite aos exemplos já encontrados.**

Examine individualmente:

- As 66 fichas visuais.

- Os 262 controles inventariados.

- As 171 relações entre superfícies.

- Os catálogos de mensagens e microcopy.

- As regras de estado, responsividade e acessibilidade.

- As especificações C3 relacionadas.

- As decisões do produto.

- O protótipo visual aprovado.

### Objetivo

Eliminar especificações genéricas, contraditórias, inadequadas à tarefa ou
capazes de produzir interfaces incorretas na Fase D.

Para cada tela, verifique:

1. Finalidade real.

2. Perfil autorizado.

3. Estado do documento ou processo.

4. Campos visíveis.

5. Campos editáveis.

6. Campos somente para leitura.

7. Campos calculados.

8. Preenchimentos automáticos.

9. Tipos de controle.

10. Obrigatoriedade.

11. Valores iniciais.

12. Máscaras e validações.

13. Ajuda contextual.

14. Exemplos de preenchimento.

15. Hierarquia das informações.

16. Ações disponíveis.

17. Consequência de cada ação.

18. Mensagens de sucesso e erro.

19. Recuperação após falhas.

20. Navegação e continuidade.

21. Comportamento em dispositivos móveis.

22. Acessibilidade.

23. Consistência com a referência visual aprovada.

24. Consistência com as regras de negócio.

**Não considere suficiente que um controle exista no catálogo: ele precisa ser
apropriado àquela tela e ao estado em que será apresentado.**

### Exemplos obrigatórios de investigação

**ENT-03:** origem, destino e quantidade expedida não devem ser descritos como
campos livremente editáveis durante a confirmação pessoal do recebimento.

**ESC-03:** a aprovação de uma alteração deve mostrar os dados da proposta e
suas consequências, sem transformar informações de contexto, como o fuso da
proposta, em parâmetros editáveis sem fundamento.

**Campos somente para leitura:** não devem receber mensagens como “Revise este
campo” quando o usuário não possui possibilidade legítima de corrigi-lo.

Identifique outras inconsistências semelhantes em todas as fichas.

### Qualidade das mensagens

Reescreva mensagens artificiais ou genéricas que não tenham sentido na
situação concreta.

Uma mensagem de erro deverá explicar, quando possível:

- O que aconteceu.

- O que foi efetivamente registrado.

- O que não foi concluído.

- Qual a consequência.

- Qual ação o usuário pode realizar.

- Quando deve procurar o responsável ou suporte.

Não apresente códigos internos, identificadores técnicos ou detalhes de
infraestrutura desnecessários ao usuário comum.

Não transforme todos os avisos em diálogos intrusivos.

### Profundidade visual

A revisão deve considerar posição, agrupamento, ordem, densidade, hierarquia,
componente apropriado, orientação e responsividade.

Quando uma tela exigir reconstrução futura, registre essa conclusão com
justificativa.

Não imponha preservação de interfaces inadequadas apenas porque já estão
implementadas.

O protótipo aprovado orienta a identidade visual, mas não substitui a
definição correta dos processos.

**Nesta missão, produza e corrija a especificação. Não implemente as telas.**

## IV. REVISÃO CRUZADA E APROFUNDAMENTO DOCUMENTAL

Após corrigir a C8:

1. Verifique coerência entre C2, C3, C4, C5, C7, C8, C9 e C10.

2. Atualize as decisões e suas precedências.

3. Corrija referências e associações que tenham perdido validade.

4. Atualize os critérios de aceitação afetados.

5. Reavalie controles, mensagens e estados de tela.

6. Confira regras de autorização e autoria.

7. Identifique requisitos ainda genéricos.

8. Aprofunde as especificações insuficientes.

9. Identifique contradições entre documentos.

10. Corrija as contradições demonstradas.

11. Preserve evidências e conclusões históricas.

12. Evite duplicar documentação quando a fonte canônica existente puder ser
    atualizada.

Execute uma revisão adversarial final.

Pergunte, para cada especificação crítica:

**Um desenvolvedor poderia interpretar isso de duas maneiras incompatíveis?**

**O controle descrito permitiria uma ação que o usuário não deveria
executar?**

**Uma mensagem poderia induzir a pessoa a compreender incorretamente o
resultado?**

**O comportamento definido preserva as decisões do responsável?**

**Existe algum estado importante sem recuperação?**

**Os critérios de aceitação conseguem distinguir o comportamento correto de um
defeito conhecido?**

Não declare a revisão concluída apenas porque os arquivos passam em linters.

## V. VALIDAÇÃO E ATUALIZAÇÃO DO PR #6

Ao concluir:

- Execute as validações documentais pertinentes.

- Confira a integridade dos arquivos e links.

- Verifique a coerência dos estados de decisão.

- Confirme que a implementação funcional permanece intacta.

- Atualize os índices e o relatório executivo final.

- Registre eventuais pendências realmente remanescentes.

- Realize commit e push na branch `audit/phase-b`.

- Atualize a descrição do Draft PR #6, se necessário.

A CI estava integralmente aprovada no SHA anterior. Novos commits deverão ser
avaliados por suas próprias verificações.

Não é necessário permanecer aguardando todos os jobs.

Informe o estado das verificações no encerramento.

### Restrições

Não altere código funcional.

Não implemente migrations.

Não altere banco ou ambientes remotos.

Não contrate serviços.

Não pesquise preços ou fornecedores.

Não execute deploy deliberado.

Não inicie a Fase D.

Não realize merge.

Não exclua branches.

## VI. META FINAL

**Entregar a Fase C com a política de ciências definitivamente aprovada e
documentada, a C8 integralmente revisada, as especificações inconsistentes
corrigidas, os critérios relacionados atualizados e o PR #6 preparado para
revisão e integração.**

A conclusão deverá informar:

1. Decisões registradas.

2. Quantidade de fichas e controles efetivamente revisados.

3. Inconsistências identificadas e corrigidas.

4. Documentos alterados.

5. Critérios de aceitação ajustados.

6. Gates remanescentes classificados corretamente.

7. Resultado das validações.

8. SHA final.

9. Estado atualizado do PR #6.

10. Estado da CI.

**Não basta produzir um relatório dizendo o que precisa melhorar. Execute as
correções documentais necessárias.**

Prossiga autonomamente até concluir toda a revisão, sem solicitar novamente
aprovação sobre decisões expressamente tomadas nesta ordem.
