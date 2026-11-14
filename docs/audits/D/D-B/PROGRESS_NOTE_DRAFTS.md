# D3.50 — preenchimento privado de Andamentos

Texto,categoria,etapa e referências incompletos agora podem ser salvos
explicitamente no servidor e retomados pela mesma conta em outra sessão.
O alvo é a ficha operacional real. Salvar não publica o andamento,não cria
documento artificial nem altera ficha,protocolo,hash,estoque ou PDF existente.

O controlador privado compartilha estados,comparação CAS,descarte e
reconhecimento. Ofertas,conflitos,resultados e tentativas incertas apresentam
resumos somente leitura,sem editores herdados desabilitados. Retomar e manter
a edição são escolhas explícitas. A publicação nativa consome a revisão privada
na mesma transação;autor,instante e identidade do andamento vêm do banco.

## Recuperação e concorrência

O pacote local congela ficha,revisão,conteúdo e chave. Uma leitura autorizada
reconcilia somente a publicação correspondente,sem novo POST. Outro envelope
permanece intacto e bloqueia reconhecimento. O formato legado ainda recupera
o POST nativo original,sem duplicar o andamento.

A consulta dedicada aguarda a trava da tentativa original e revalida o acesso
depois da espera. Diário ausente significa resultado desconhecido. Revisão
monotônica avançada ou vínculo imutável de chave incompatível comprovam que
aquele pacote não pode mais aplicar-se. Essa consulta não publica,não salva
e não decide sozinha por outra edição.

Se outra sessão concluiu o privado,o usuário pode preservar explicitamente
seu texto para um novo preenchimento e reconhecer o resultado vencedor.
A escolha sobrevive à recarga e à perda da resposta do reconhecimento.
Publicação conhecida,preparação ativa e edição local têm identidades distintas.

## Autorização e preservação

Leitura própria exige vínculo vivo e leitura atual da ficha. Perda de escrita
ou paciente inativo permite recuperação,descarte e reconhecimento próprios,
sem autorizar nova publicação. Referências protegidas recebem rótulos sob
permissões atuais. Duas tabelas RLS fechadas,três helpers e quatro RPCs Auth
aditivos não substituem os seis motores/dependências nativos conferidos.
Recusa tardia reverte andamento,consumo,diário e auditoria juntos.

O limite do texto foi alinhado explicitamente à contagem UTF-16 do banco e do
controle HTML. O caso com caracteres fora do plano básico revelou que a
validação genérica instalada contava pontos de código;contraprova preservada.
Cache privado,replay offline e integrações externas continuam ausentes.

## Regressões e limites

A CI do baseline264dd84 terminou com banco/Ubuntu/Windows aprovados e falhas
de navegador. A agenda agora preserva a revisão congelada no encerramento
obsoleto confirmado. O balanço restaura foco após o formulário sair do estado
ocupado. O teste de revogação Flow conserva somente o contexto anterior da
tela para exigir recusa real da API filha,sem corrida com a retirada da tela
pelo contexto pai. Intermitências de outros consumidores não viram aprovação.

35 unitários/API e11Auth reais passaram. São28 identidades distintas de
navegador de produção local:dez casos preservados,15 regressões afetadas e o
recheck final Flow3/3. Diagnóstico anterior2/3 teve contexto503 antes do fluxo
Chromium;foi preservado,sem contar como aprovação. Tipos/lint dirigidos passam.
Cinco larguras,axe e capturas320 inspecionadas têm escopo limitado ao incremento.

As coortes,contraprovas,hashes e reconciliação remota constam da
[validação](PROGRESS_NOTE_DRAFTS_VALIDATION.json). CI própria,instalação limpa,
evolução legada e integração integral são gates independentes. Agenda privada,
contagens e demais lacunas do inventário permanecem com Codex;este incremento
não aprova as66 composições/171 relações nem todos os105 critérios. PR7 Draft,
Sonar adiado,produção NO-GO e meta ativa.
