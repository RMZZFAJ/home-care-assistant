# B1.6 — Resultado das ações e próxima responsabilidade

O produto preserva distinções operacionais importantes e tem mecanismos reais
de recuperação de tentativa. A prova de aquisição COM com resposta perdida
recuperou exatamente o mesmo payload e produziu um único evento. Essa qualidade
deve ser preservada ao corrigir resumos e mensagens genéricas.

## Inventário de ações e evidência

[07_FEEDBACK_ACTIONS_MATRIX.csv](07_FEEDBACK_ACTIONS_MATRIX.csv) separa comandos
e variantes de intenção humana. [ACTION_CONTROLS.csv](evidence/ACTION_CONTROLS.csv)
concilia callsites de botões, links, menus, formulários e seleções; mantém
handlers, condições disabled, consumidores e textos/expressões originais.
Um controle compartilhado pode emitir vários comandos; por isso existem dois
denominadores. Componentes órfãos e primitivos sem consumidor direto não são
contados como ação efetivamente exercitada.

Nem todos os verbos foram clicados. Recusa de convite, revogação de sessão,
cancelamentos com consentimento, retries de fila e provedores têm análise
estática e cenários propostos. Nenhum envio externo ou decisão de produção
foi executado. O catálogo não converte esse limite em aprovação nominal.

## Comandos efetivamente confirmados na fixture B1

| Ação | Resultado persistido e reconsulta | Feedback humano |
| --- | --- | --- |
| COM Registrar aquisição, abortar resposta200 após commit | Estado purchased v2; repetir mesmo hash de payload devolve resultado; um com.purchase no histórico | Revisão permanece e oferece Recuperar tentativa; bom mecanismo, mas sucesso genérico não explica próxima etapa |
| ENT Confirmar recebimento pelo destinatário designado | ENT confirmed v3; equipe passa de0/0 para10/2; família já tinha20/28 após expedição | Estado e linhas2/2 ajudam; confirmação integral não repete nomes/quantidades no diálogo |
| REQ vinculada após ENT | REQ v4,2/2 atendidos; ciência satisfeita em dimensão separada | Distinção visível e preservável; não atribuir atendimento à COM |
| Relato de consumo familiar de1 unidade | Saldo permanece20 antes e depois do relato | Mensagem genérica, mas registro diz aguardando confirmação |
| Confirmar o relato autorizado | Saldo familiar do material passa20→19; equipe permanece10 | Mensma frase genérica do relato, apesar de o efeito agora ser débito confirmado |
| BAL pelo trabalhador designado, contagem10/2 | BAL approved v1 pela política vigente; referência10/2; PDF real gerado | Resultado diz conforme política; não houve aprovação familiar neste cenário |
| Familiar consulta BAL | Abre o documento já aprovado; sem comando adicional | Reconsulta verificada; não é prova de revisão distinta executada |

Fontes atuais: [b16-feedback.json](evidence/b16-feedback.json) e
[b16-consumption.json](evidence/b16-consumption.json). A primeira tentativa do
relato usou label exato que incluía opções do select; nenhum relato foi enviado
ali. A repetição usa o campo de nome location conhecido da fonte. Três folhas
de contato e as duas páginas do BAL foram abertas. Capturas de sucesso COM/ENT
incluem refresh em curso; a certeza de persistência vem também do read-back.

O teste de anexo da etapa anterior teve efeito diferente: o arquivo foi
persistido, mas o catch raw manteve seleção editável. A recuperação correta da
COM é contraprova de que o problema de incerteza é específico de consumidor.

## Confirmações: conteúdo que a barreira precisa proteger

Escala pontual continua P1: o aprovador vê motivo e pedido genérico de revisão,
sem antes/depois da pessoa, período e fuso. Estoque manual omite direção e
unidade; divergência ENT omite item/quantidade aceita; configuração BAL omite
dia/tipo/pessoa/fuso. As barreiras existem, mas o conteúdo varia em qualidade.

Padrão proposto: objeto identificado, operação, valores/unidades, antes/depois,
efeito imediato e pendência posterior; motivo quando necessário; Voltar à
edição e verbo específico para confirmar. O mesmo componente pode servir, mas
o resumo deve ser montado pelo comando de negócio. Não exigir confirmação
modal para cada consulta, filtro ou seleção local.

Na permissão crítica, erro409 fecha o diálogo e desloca o erro. O feedback
deve permanecer ligado à alteração pretendida e dizer o que foi recarregado.
Proposta global e vínculo aguardando aceite não podem receber o mesmo texto
de configuração aplicada.

## Persistência, prazo e canais

Persistência de documento, disponibilidade no aplicativo, aceite pelo provedor,
entrega, leitura e ciência são estados independentes. `DocumentDeliveryStatus`
explica isso corretamente. A fila administrativa exige conciliação explícita
antes de reprocessar incertos; preservar essa proteção.

As notificações observadas pertencem ao ambiente local com envio externo
desabilitado. Não se presume sucesso de WhatsApp/SMTP, template aprovado ou
Share Sheet do aparelho. A renderização de texto externo foi revisada na etapa
B1.3; datas e contadores do presenter de notificações têm dependências abertas
da Fase A (BE-002), sem envio real nesta fase.

O sucesso deve permanecer reconsultável na ficha/histórico. Mensagem transitória
pode complementar, mas não carregar a única referência de resultado incerto.
O prazo10s de DocumentActions não pode transformar conclusão em processamento;
preparo de PDF e consulta de avisos precisam de estados independentes.
As orientações de
[Toast Fluent](https://fluent2.microsoft.design/components/web/react/core/toast/usage)
reservam essa superfície para informação transitória; recuperação crítica deve
continuar acessível em mensagem persistente ou contexto decisório.

## Segunda passada e contraditório

Após interrupção, a pergunta humana é: o que foi registrado, quem faz o próximo
passo e onde eu confiro? Um texto Operação confirmada pode ser verdadeiro,
mas insuficiente quando relatado, validado, adquirido e recebido têm efeitos
distintos. A proposta é especificidade proporcional e links à reconsulta.

Recusadas: remover confirmação para economizar toque em estoque/aceite;
tratar todo evento como mensagem externa; marcar aviso como ciência; criar
reversão destrutiva de fatos imutáveis; repetir operação com nova chave após
perda de resposta; exigir revisão familiar quando a política vigente permite
aprovação automática. Regras e autoridade continuam no banco/API.
