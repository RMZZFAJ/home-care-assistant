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
reproduzível em `build-b13.cjs` . O inventário é deliberadamente inclusivo;
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

- **Contrato/termo:** REQ; **Expressão humana e regra de uso:** Requisição de
materiais; registra necessidade e estoque observado; **Evitar:** Quantidade
solicitada, pedido de compra automático.
- **Contrato/termo:** COM; **Expressão humana e regra de uso:** Compra ou doação
de insumos; origem explicitada; **Evitar:** Chamar toda COM de pagamento ou
entrega.
- **Contrato/termo:** ENT; **Expressão humana e regra de uso:** Entrega de
materiais; distinguir expedida, recebida e divergente; **Evitar:** Expedição
como recebimento confirmado.
- **Contrato/termo:** BAL; **Expressão humana e regra de uso:** Balanço de
estoque / contagem física; identificar plantão e semanas; **Evitar:** Consumo
automático, presença comprovada.
- **Contrato/termo:** ciência; **Expressão humana e regra de uso:** Registro de
ciência familiar; modo e momento explícitos; **Evitar:** Aceite de material,
assinatura digital, prova de leitura integral.
- **Contrato/termo:** express; **Expressão humana e regra de uso:** Ciência
expressa no aplicativo; **Evitar:** Automática.
- **Contrato/termo:** app_visible; **Expressão humana e regra de uso:**
Abertura/exposição segundo critério aprovado, identificado como automática;
**Evitar:** Conteúdo lido sem prova.
- **Contrato/termo:** dispatch; **Expressão humana e regra de uso:** Ciência por
expedição autorizada, quando a política permitir; **Evitar:** Ciência expressa
atribuída a outra pessoa.
- **Contrato/termo:** FAMILY; **Expressão humana e regra de uso:** Estoque da
família; **Evitar:** Saldo da equipe.
- **Contrato/termo:** CARE_TEAM; **Expressão humana e regra de uso:** Estoque da
equipe; **Evitar:** Tudo que foi apenas expedido.
- **Contrato/termo:** TRANSIT; **Expressão humana e regra de uso:** Materiais em
trânsito, aguardando conferência; **Evitar:** Estoque já recebido.
- **Contrato/termo:** incoming/projeção; **Expressão humana e regra de uso:**
Previsão, com origem e dependência; **Evitar:** Saldo confirmado.
- **Contrato/termo:** rascunho local; **Expressão humana e regra de uso:**
Preenchimento desta aba, prazo e hora; **Evitar:** Salvo no dispositivo sem
delimitar alcance.
- **Contrato/termo:** rascunho servidor; **Expressão humana e regra de uso:**
Rascunho gravado no sistema; ainda não emitido; **Evitar:** Contagem
concluída.
- **Contrato/termo:** proposta; **Expressão humana e regra de uso:** Alteração
aguardando decisão; dizer quem decide; **Evitar:** Alteração aplicada.
- **Contrato/termo:** awaiting_acceptance; **Expressão humana e regra de uso:**
Aguardando aceite do destinatário; ainda sem vínculo; **Evitar:** Nenhuma
proposta pendente se há essa responsabilidade.
- **Contrato/termo:** inherited; **Expressão humana e regra de uso:** Herdar
regra da função; mostrar resultado efetivo; **Evitar:** Permitido por
identidade global ou nome.
- **Contrato/termo:** accepted do convite; **Expressão humana e regra de uso:**
Convite aceito; vínculo consultável separadamente; **Evitar:** Revogar convite
equivale a revogar vínculo.
- **Contrato/termo:** hash SHA-256; **Expressão humana e regra de uso:** Código
de integridade da versão; **Evitar:** Assinatura digital da pessoa.
- **Contrato/termo:** protocolo/código; **Expressão humana e regra de uso:**
Identificação documental; código curto para tarefa; **Evitar:** Usar UUID como
único nome humano.
- **Contrato/termo:** referência de erro; **Expressão humana e regra de uso:**
Identificador seguro para suporte; **Evitar:** Payload técnico, stack ou
segredo.
- **Contrato/termo:** known success; **Expressão humana e regra de uso:**
Registrado, com referência recuperável; **Evitar:** Mensagem enviada a alguém
sem prova do canal.
- **Contrato/termo:** unknown result; **Expressão humana e regra de uso:** Não
foi possível confirmar o resultado; recuperar tentativa; **Evitar:** Falhou,
envie tudo novamente.
- **Contrato/termo:** notification seen; **Expressão humana e regra de uso:**
Vista no aplicativo; **Evitar:** Ciência, recebimento ou leitura de WhatsApp.

## Constatações e propostas prioritárias

Os filtros `science_required` e `archive_pending` aparecem no chip, enquanto o
select apresenta português correto. A prova atual está em
[b13-text.json](evidence/b13-text.json). Traduzir no presenter de filtros e
no nome acessível de remover; manter as chaves de API intactas.

O menu Preferências e notificações abre `/notificacoes` ; preferências estão
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

Datas documentais usam `formatBrazilDate` , com fuso fixo America/Sao_Paulo.
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

## Atributos dinâmicos complementares

DYNAMIC_ATTRIBUTE_COPY.csv acrescenta expressões de
aria-label,title,placeholder,label,summary,alt e labels compostos. O extrator
inicial cobria literais e filhos JSX; esta reconciliação fecha a diferença de
denominador sem afirmar que cada valor foi renderizado. Expressões continuam
NOT_VERIFIED quanto à clareza de todos os valores. Os12.343 candidatos originais
continuam contabilizados integralmente no arquivo de disposição; os novos
atributos têm catálogo próprio e IDs distintos.
