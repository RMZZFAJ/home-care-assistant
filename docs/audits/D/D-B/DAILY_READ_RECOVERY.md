# D3.19 — falhas de consulta e recuperação nas tarefas diárias

Base3a6bdc9. Cinco contraprovas de produção Chromium falharam antes da correção:
anexos/guia conservavam conteúdo após recusa; atualizar ENT/escala perdia foco;
código inválido não recebia foco. Logs, screenshots e contextos foram guardados.
PDFs conservam aparência; a alteração é de comportamento e dados consultados.

## Implementação e cobertura

| Superfície | Comportamento e comprovação |
| --- | --- |
| ENT-03 | Leitura503/403, fatos imutáveis e foco na recuperação. |
| ESC-03 | Leitura503; antes/depois/fuso em texto; motivo próprio editável. |
| DOC-02 | Nove bindings e prova D3.18 preservados, sem contar nova execução. |
| DOC-05 | PDF escolhido preservado; erro de análise não vira erro de input. |
| ARQ-02 | Intenção congelada; recuperação503/403 sem segundo upload. |
| GUI-04 | Pendente; guia pessoal não comprova runbook operacional. |

Na ENT,403 oculta os fatos sem confirmação/expedição nova. No verificador,
PDF passivo real retorna sem assinatura e sem emissão nova. Código/arquivo
inválidos focam só o próprio campo; indisponibilidade oculta o resultado.

A lista de anexos é retirada ao falhar sua consulta, inclusive resposta200
inválida. Recusas401/403/404 durante recuperar/enviar/abandonar retiram os links
e pedem atualização da seção; não liberam outra intenção automaticamente.
O arquivo selecionado e o pacote desconhecido são conservados. Só tamanho
excessivo e original divergente marcam o próprio arquivo inválido. Foco ocorre
depois de liberar o campo; erro de leitura não ganha aria-invalid de arquivo.

Os controles de recuperação que precisam continuar no teclado usam
aria-disabled com guarda efetiva. O envio bloqueado não atravessa o handler;
botão nativo e aria-disabled têm apresentação consistente. O público distingue
entrada inválida de indisponibilidade do serviço e concentra foco de resultado
na resposta correspondente. Não há replay offline ou nova autorização no UI.

O guia pessoal também oculta tarefas antigas durante consulta/falha. A chave
inclui titular, paciente, modo, papel e tentativa. Retry permanece no DOM e
conserva foco. Progresso e configuração confirmados continuam no servidor;
recuperação de gravação incerta não é substituída por outra intenção.

## Evidências e correções dos instrumentos

O [manifesto](DAILY_READ_RECOVERY_EVIDENCE.json) separa coortes, fonte final,
contraprovas e reutilização. As regressões incluem cinco casos novos por motor
e oito consumidores anteriores, com Auth local real, origem/stack verificadas
e transporte externo desligado. Casos existentes conservam upload confirmado
com resposta perdida, abandono, fingerprint, limite4MB, perfil do guia,
preparação global inativa, recebedor e conflito de escala.

A primeira coorte passou cinco casos e parou porque o teste da ENT repetia
Atualizar antes de a consulta acabar, vendo o material anterior retido após503.
O teste passou a aguardar disponibilidade do controle, sem retirar a guarda.
A seguinte passou dez e parou por seletor de alertas ambíguo com o anunciador
interno do Next. A busca foi delimitada ao main público; Axe continua inteiro.
Os dez PASS dessa fonte foram preservados. A
[lista de execução](https://playwright.dev/docs/test-cli#test-list)
selecionou somente os29 casos restantes, sem excluir caso pendente
ou reinterpretar falha como sucesso. Coleção/lista/log estão vinculados.

Não houve suíte mutável de banco em paralelo ou repetição global local. Erros
esperados de API ficam nos logs, com código seguro/correlação. Os ensaios não
homologam aparelho, leitor de tela, zoom físico ou tarefa humana de recuperação.

## Guia e preparação: estado real

C-NEW-AC-027 recebe PARTIAL pela base existente, com o guia corrigido e casos
atuais. Não se presume encerrada GUI-01/02/03: revisão por todos os perfis,
adoção material, delegação local e contingência precisam de consolidação.
Texto de orientação não comprova tarefa física ou recuperação operacional.

Foram reaproveitadas sete regressões Auth do job database da
[CI3a6bdc9](DAILY_READ_CI_BASE.json), todas aprovadas entre395 testes. API,
validação, preparação, conteúdo, duas migrations e testes de backend relevantes
coincidem com o dossiê D3.5. O guia e o teste de navegador mudaram e têm provas
novas; o reaproveitamento não lhes atribui aprovação antiga.

## Limites de fechamento

C-FINAL-AC-023 continua parcial por GUI-04 e gates humanos/AT/aparelho. A
[consulta remota atual](DAILY_READ_REMOTE_OBSERVATION.json) reconciliou as161
versões locais, zero pendências. Nenhuma migration nova; o
[recibo de aplicação](CREDENTIAL_REMOTE_MIGRATIONS.json) permanece preservado,
sem mutação remota/backup/restore repetido. Assinatura/TSA e monitores conservam
seus dossiês. CI própria do novo SHA segue obrigatória, Sonar adiado pelo
responsável, PR7 Draft, sem merge/promoção. Meta D-B ativa.
