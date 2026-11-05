# B1.7 — Campos e esforço de preenchimento

O padrão mais forte já presente é seleção pronta de material, pessoa, função,
unidade e tipo de operação. A REQ acrescenta busca por nome/alias e revisão de
possível repetição. A contagem BAL começa vazia e só revela referência depois
da contagem; preservar essa proteção contra copiar o saldo esperado.

## Catálogo campo a campo

[08_FORM_FIELD_CATALOG.csv](08_FORM_FIELD_CATALOG.csv) contém213 callsites,
incluindo wrappers administrativos Field/Check/RoleSelect. Três são definições
de primitivo e dez pertencem a componentes sem consumidor; não são novos
campos ativos. Cada registro conserva label/binding, condição, repetição,
default, opções, required, limites, inputMode, autocomplete, disabled herdado,
persistência, diagnóstico, recomendação e invariantes. Objetos de restrições
são serializados como JSON, não como `[object Object]` .

O catálogo foi revisado pelos213 registros de label/nome/tipo/required, além
da leitura integral de fontes UI. Foram corrigidas a classificação de select
nativo e a resolução de labels compostos. Label não resolvido pelo extrator
não seria, por si, defeito acessível. Cada linha repetida de produto é um
esquema de campo, não uma afirmação sobre todos os valores possíveis.

## Provas com dados atuais e simulados

- **Experimento:** Selecionar material real na REQ; **Resultado:** Estoque
observado inicia0 sem quantidade física digitada.
- **Experimento:** Extra sem nome e avançar; **Resultado:** Erro geral na
etapa;0 campos aria-invalid e foco permanece em Avançar.
- **Experimento:** Digitar7 e apagar estoque do extra; **Resultado:** Campo
retorna0 por Number(vazio); diferente do campo de catálogo.
- **Experimento:** Salvar rascunho e recarregar mesma aba; **Resultado:** Um
item e um extra sintéticos recuperados.
- **Experimento:** Nova aba independente no mesmo contexto autenticado;
**Resultado:** Nenhum rascunho anterior recuperado; sessão da conta continua
válida.
- **Experimento:** Observação1001 caracteres pela UI; **Resultado:** Campo não
tem maxlength; revisão alcançada; POST real rejeita400 em inglês; nenhuma REQ
emitida.
- **Experimento:** Catálogos simulados1/5/20/100; **Resultado:** REQ busca por
alias reduz todos a1; COM mostra1/5/20/100 sem busca textual.
- **Experimento:** Digitar1.5 e1,5 em número com2casas; **Resultado:** Ambos
resultam em valor canônico1.5 no Chromium pt-BR desta prova.

Fontes: [b17-forms.json](evidence/b17-forms.json) e
[b17-followup.json](evidence/b17-followup.json). Quatro folhas foram abertas.
As falhas da primeira rodada pertencem ao reprodutor: confundiu Avançar com
Revisar e tentou COM no perfil profissional sem capacidade de criação. A
repetição usou administrador autorizado e aguardou mudança real de etapa.
Não foram alteradas capacidades para fazer a prova passar.

Os catálogos grandes são respostas de leitura injetadas no navegador; não
foram criados100produtos no banco. Tempos locais de cerca de1,4–1,5s incluem
navegação automatizada e não medem velocidade humana nem latência de produção.
Estoque familiar indisponível dos IDs simulados é efeito da injeção sem
item-context correspondente, não achado do produto.

## Diagnóstico por conjunto de campos

- **Campos / IDs:** REQ estoque observado FLD-0152 e extra FLD-0156; **Decisão
recomendada e razão:** Distinguir não informado de zero e exigir observação
explícita conforme contrato. Zero significa ausente; não pode ser valor
silencioso de apagar.
- **Campos / IDs:** Extra nome/urgência FLD-0155/0157; **Decisão recomendada e
razão:** Manter texto para exceção e escolha explícita de sugestão;
limite20extras deve aparecer antes do envio.
- **Campos / IDs:** Observação FLD-0158; **Decisão recomendada e razão:**
Máximo1000 por observação e50 entradas, contador discreto e erro ligado ao
campo; CTA Corrigir observação1 na revisão.
- **Campos / IDs:** Motivo de repetição FLD-0149/0154; **Decisão recomendada e
razão:** Manter campo contextual ao material e comparação da pendência; não
preencher justificativa fictícia automaticamente.
- **Campos / IDs:** COM/ENT seleção e quantidade FLD-0125–0132; **Decisão
recomendada e razão:** Manter origem/destinatário prontos; acrescentar busca
por nome/alias ao catálogo grande, com total selecionado e unidades.
- **Campos / IDs:** ENT divergência FLD-0114–0124; **Decisão recomendada e
razão:** Escolha de problema já evita digitação; resumo precisa listar
quantidade aceita, unidade e diferença restante por linha.
- **Campos / IDs:** Consumo FLD-0189–0197; **Decisão recomendada e razão:**
Manter tipo/custódia/seleção prontos; texto só para explicar o fato. Ajuda
atual fala família enquanto default oferece equipe: ajustar escopo da frase.
- **Campos / IDs:** BAL FLD-0081/0082; **Decisão recomendada e razão:** Manter
quantidades vazias, unidade e revisão posterior; não oferecer copiar
referência ou usar último saldo como contagem física.
- **Campos / IDs:** Apresentação FLD-0102–0104; **Decisão recomendada e razão:**
Ao preencher código, indicar nome e conversão necessários;
exemplo1embalagem=Nbase e consulta de apresentações existentes.
- **Campos / IDs:** Catálogo FLD-0019–0025; **Decisão recomendada e razão:**
Unidade livre exige catálogo de medidas coerente com unidades/apresentações;
aliases separados por vírgula podem evoluir para tags se uso justificar.
- **Campos / IDs:** Vínculo FLD-0032/0033; **Decisão recomendada e razão:**
Identidade deve ficar fixa ao editar função ou haver ação explícita de
substituir/criar; payload atual só leva userId escolhido.
- **Campos / IDs:** Contatos FLD-0073–0078; **Decisão recomendada e razão:**
Preservar e-mail, país e código como campos distintos; ajudar verificação, não
prometer entrega do provedor.
- **Campos / IDs:** Senha FLD-0079/0080/0142/0143; **Decisão recomendada e
razão:** Entrada existente não deve ganhar regra de cadastro. Senha nova:
min12, teto72 bytes e ajuda prévia; perfil permite256 caracteres.
- **Campos / IDs:** Nome curto FLD-0065; **Decisão recomendada e razão:** UI
vazia precisa significar remover ou manter de forma explícita; saveSettings
omite vazio, impedindo comunicar intenção de remoção.
- **Campos / IDs:** Política FLD-0057–0072; **Decisão recomendada e razão:**
Mostrar regime ativo e escopo; números com unidade e vigência. Não criar
configuração de garantias transacionais.
- **Campos / IDs:** Recorrência FLD-0166–0188; **Decisão recomendada e razão:**
Presets12/24h e regimes existentes já ajudam; substituir âncora por primeiro
dia e mostrar próximas datas/fuso antes da confirmação.
- **Campos / IDs:** Destinos FLD-0041–0046; **Decisão recomendada e razão:**
Campo condicional por canal, formato e conta autorizada; interno não deve
pedir destino externo.
- **Campos / IDs:** Importação FLD-0007; **Decisão recomendada e razão:** JSON
pode permanecer ferramenta técnica restrita; operador sem familiaridade
precisa preview por registro/erro ou importação assistida.
- **Campos / IDs:** Foto/anexo FLD-0091/0105/0141; **Decisão recomendada e
razão:** Manter foto/manual, câmera e seleção de arquivo. Estado incerto
precisa congelar tentativa, sem exigir foto real na auditoria.
- **Campos / IDs:** Busca/data FLD-0108–0112/0204–0213; **Decisão recomendada e
razão:** Preservar filtros em URL onde já existem; diferenciar vazio por
busca, período inválido e erro de consulta.

Intervalos de IDs nesta tabela são agrupamentos de discussão; o CSV continua
uma linha por campo e explicita os consumidores/variantes.

## Redução de digitação e configurações justificáveis

Priorizar busca e aliases já disponíveis na REQ para COM/ENT; seleção de pessoa
com nome e função; apresentações por produto com conversão visível; presets
temporais editáveis; e retorno ao campo inválido. Não usar texto livre para
quantidades ou identidades quando há seleção autorizada.

Texto livre permanece adequado a exceção, motivo, observação operacional e
história física. Transformar cada relato numa taxonomia extensa pode aumentar
toques e esconder a informação relevante. Motivos prontos devem ser validados
por repetição real, mantendo Outra situação com texto. Não criar presets de
doses, administração clínica ou consumo esperado a partir desta auditoria.

Configurações candidatas para decisão: continuidade de rascunho entre abas ou
dispositivos, prazo de retenção correspondente e responsável; apresentação
favorita por material quando houver alternativas reais; densidade de lista
quando tarefas de gestão justificarem. Não são autorização para implementar.
Constantes de integridade, limites de autorização e invariantes de estoque
não devem virar preferências do navegador.

## Segunda passada, custo e contraprovas

1material não precisa de um seletor complexo;100 materiais tornam varredura
manual mais cara. A busca existente na REQ é contraprova de que a solução
precisa de nova dependência ou nova tela. Da mesma forma, câmera não substitui
digitação manual, e texto adicional em todo campo torna o formulário mais lento.

A hipótese de vírgula ser rejeitada não se confirmou nesta emulação; não gera
defeito. A regra de estoque não observado depende de decisão de produto e de
contrato: não basta adicionar null no browser. O problema demonstrado é a
confluência silenciosa de vazio/zero, não quantidade errada gravada em produção.

Não houve teste humano, teclado virtual físico, fechamento real de aplicativo,
retomada em outro aparelho, autofill de gerenciador de senhas ou leitura de
código por câmera real. Esses casos têm roteiro em10 e permanecem NOT_VERIFIED.
