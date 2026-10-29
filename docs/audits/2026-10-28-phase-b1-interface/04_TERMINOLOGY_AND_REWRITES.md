# B1.3 — Linguagem, ajuda e termos humanos

O produto já explica corretamente várias distinções difíceis: requisição não
movimenta estoque; envio de materiais ainda depende de recebimento; ciência
familiar e atendimento são fatos independentes; escala é programação prevista.
Essas frases devem permanecer visíveis nas etapas em que orientam uma decisão.

## Catálogo e limites da exaustividade

[04_TEXT_INVENTORY.csv](04_TEXT_INVENTORY.csv) conserva o original, fonte/linha,
contexto da expressão, consumidores, classificação, proposta e limite de prova.
[TEXT_CANDIDATE_DISPOSITION.csv](evidence/TEXT_CANDIDATE_DISPOSITION.csv)
concilia todos os 12.343 candidatos da extração original: textos de teste,
CSS, imports, classes e chaves não são mensagens do produto. A filtragem é
reproduzível em `build-b13.cjs`. O inventário é deliberadamente inclusivo;
alguns valores potencialmente humanos podem servir apenas a um ramo interno.
Não usar seu total como quantidade de defeitos ou textos efetivamente vistos.

Além de literais, [expressões dinâmicas](evidence/DYNAMIC_TEXT_EXPRESSIONS.json)
incluem nomes, status, quantidades, datas, labels, histórico, dados de API e
fallbacks. Os valores privados possíveis não são enumerados nem copiados.
Interfaces ausentes, strings do navegador e erros Zod/Auth dependem de geração
em execução; a matriz de erros registra esses cenários separadamente.

`HUMAN_CLEAR` significa julgamento do auditor sobre a fonte, não teste de
compreensão com uma pessoa. `NOT_VERIFIED` em expressão dinâmica significa
que todos seus valores não foram renderizados. Correspondência textual em
uma captura não comprova que cada consumidor foi exercitado. As classificações
AMBIGUOUS, MISLEADING e TECHNICAL_EXPOSED recebem propostas específicas quando
a evidência permite. Riscos de persistência não são resolvidos só por texto.

[TEXT_REWRITES.csv](evidence/TEXT_REWRITES.csv) contém propostas completas,
incluindo frases com slots de negócio nomeados. Esses slots exigem dados
autorizados: não são autorização para exibir IDs ou payloads indiscriminados.
O catálogo externo está em
[EXTERNAL_TEMPLATE_COPY.csv](evidence/EXTERNAL_TEMPLATE_COPY.csv). Todos os
corpos/botões foram lidos como conteúdo; envio, aprovação atual na Meta e
renderização no WhatsApp permanecem NOT_VERIFIED.

## Glossário canônico proposto

| Contrato/termo | Expressão humana e regra de uso | Evitar |
| --- | --- | --- |
| REQ | Requisição de materiais; registra necessidade e estoque observado | Quantidade solicitada, pedido de compra automático |
| COM | Compra ou doação de insumos; origem explicitada | Chamar toda COM de pagamento ou entrega |
| ENT | Entrega de materiais; distinguir expedida, recebida e divergente | Expedição como recebimento confirmado |
| BAL | Balanço de estoque / contagem física; identificar plantão e semanas | Consumo automático, presença comprovada |
| ciência | Registro de ciência familiar; modo e momento explícitos | Aceite de material, assinatura digital, prova de leitura integral |
| express | Ciência expressa no aplicativo | Automática |
| app_visible | Abertura/exposição segundo critério aprovado, identificado como automática | Conteúdo lido sem prova |
| dispatch | Ciência por expedição autorizada, quando a política permitir | Ciência expressa atribuída a outra pessoa |
| FAMILY | Estoque da família | Saldo da equipe |
| CARE_TEAM | Estoque da equipe | Tudo que foi apenas expedido |
| TRANSIT | Materiais em trânsito, aguardando conferência | Estoque já recebido |
| incoming/projeção | Previsão, com origem e dependência | Saldo confirmado |
| rascunho local | Preenchimento desta aba, prazo e hora | Salvo no dispositivo sem delimitar alcance |
| rascunho servidor | Rascunho gravado no sistema; ainda não emitido | Contagem concluída |
| proposta | Alteração aguardando decisão; dizer quem decide | Alteração aplicada |
| awaiting_acceptance | Aguardando aceite do destinatário; ainda sem vínculo | Nenhuma proposta pendente se há essa responsabilidade |
| inherited | Herdar regra da função; mostrar resultado efetivo | Permitido por identidade global ou nome |
| accepted do convite | Convite aceito; vínculo consultável separadamente | Revogar convite equivale a revogar vínculo |
| hash SHA-256 | Código de integridade da versão | Assinatura digital da pessoa |
| protocolo/código | Identificação documental; código curto para tarefa | Usar UUID como único nome humano |
| referência de erro | Identificador seguro para suporte | Payload técnico, stack ou segredo |
| known success | Registrado, com referência recuperável | Mensagem enviada a alguém sem prova do canal |
| unknown result | Não foi possível confirmar o resultado; recuperar tentativa | Falhou, envie tudo novamente |
| notification seen | Vista no aplicativo | Ciência, recebimento ou leitura de WhatsApp |

## Constatações e propostas prioritárias

Os filtros `science_required` e `archive_pending` aparecem no chip, enquanto o
select apresenta português correto. A prova atual está em
[b13-text.json](evidence/b13-text.json). Traduzir no presenter de filtros e
no nome acessível de remover; manter as chaves de API intactas.

O menu Preferências e notificações abre `/notificacoes`; preferências estão
em Perfil > Identidade pessoal. Usar Minhas notificações para esse destino e
uma entrada separada Preferências de avisos. A central também deve oferecer
essa ligação, evitando depender de conhecer a organização do perfil.

O JSON de proposta foi renderizado com uma resposta de leitura sintética,
explicitamente injetada no navegador. Isso prova o presenter e não a criação
de uma proposta no banco. Mostrar regra/pessoa, antes/depois e efeito em
linguagem de negócio; conservar JSON em detalhe diagnóstico autorizado.

No trânsito, o fallback Produto perde identificação do material quando o
overview não contém o produto. Buscar nome autorizado no snapshot e, se
realmente desconhecido, admitir isso com caminho ao documento. Renomear o
fallback isoladamente não resolve a ausência do dado.

A COM de doação continua recebendo o título Compra de insumos. A origem é
selecionada corretamente no formulário; o ajuste deve propagar a linguagem
para ficha, histórico, PDF e notificações sem fundir seus estados com ENT.

As frases de rascunho, sucesso genérico de consumo e prazo de avisos precisam
refletir mecanismo/resultado real. As propostas RW correspondentes indicam
quando há dependência de mudança de estado, contrato ou decisão de produto.

## Ajuda contextual, números e casos raros

Ajuda abaixo do campo é indicada para estoque observado, conversão de
embalagem, precisão de unidade, senha, primeiro dia de recorrência, fuso e
alcance de política. O usuário precisa dessa informação antes de digitar.
Tooltip serve a detalhe secundário; não é a única explicação de uma ação
crítica em tela de toque. Campos Nome e E-mail normalmente não precisam de
parágrafos adicionais.

Datas documentais usam `formatBrazilDate`, com fuso fixo America/Sao_Paulo.
Agenda permite outros fusos e mostra identificadores IANA. Tornar a cidade
reconhecível e repetir o fuso no resumo da decisão. Não inferir que todo
timestamp do sistema pertence ao fuso configurado do paciente.

Pluralizar 1 registro/N registros e 1 aviso/N avisos, evitando registro(s).
Quantidade deve conservar a unidade e precisão; vírgula de entrada e ponto
canônico não autorizam arredondamento silencioso. Nome longo deve quebrar ou
ter alternativa integral acessível; truncamento do seletor pode ser aceito
porque o nome também aparece na página, mas exige teste com a pessoa.

Para estado desconhecido: Situação ainda não reconhecida nesta versão.
Atualize a consulta ou informe a referência ao suporte. Exibir código somente
em detalhe técnico seguro. `StatusBadge` hoje devolve o próprio status; o
fallback genérico de evento já evita despejar action desconhecida, mas perde
especificidade. Não inventar uma tradução que declare conclusão inexistente.

## Segunda passada e objeções

Uma pessoa não técnica pode cumprir uma instrução tecnicamente precisa e
ainda entender efeito errado: aprovar proposta não aplica imediatamente um
vínculo; contar não equivale a relatar consumo; baixar PDF não prova entrega
de mensagem. A revisão de linguagem deve ocorrer junto dos resumos e estados.

Foram recusadas simplificações que trocam ciência por aceite, ocultam origem
automática, chamam tudo de pedido ou eliminam hash/histórico. Também foi
recusada ajuda em todos os campos e configuração de cada termo. O glossário
é uma proposta editorial para Fase C; compreensão por família/profissionais
e variação regional de técnica/profissional ainda precisam de teste humano.
