# Exploração renderizada atual

Base: `37cb7f85e96e551d6419871f94dd950712e2565b`. Execução em 27/10/2026,
23h28–23h31 em America/Sao_Paulo; consolidação em 28/10. Os JSONs preservam
UTC, que já corresponde a 28/10. Chromium local em 127.0.0.1:3100, Node
24.22.0, Auth oficial local e dados fictícios. Envio externo desativado.

Os reprodutores `ui-runtime.mjs` e `ui-runtime-ready.mjs` alteram somente a
stack local verificada: criam fixtures, sessões, políticas e documentos.
Não são scripts de consulta nem devem ser executados contra outro destino.
O servidor foi iniciado pelo runner que verifica a stack existente.

## Método e alcance

Login pela interface para administrador local, profissional, família,
supervisor, leitor e administrador global. Contexto selecionado pela API
autenticada. Todas as 14 capturas com prefixo `ui-dashboard-ready-` foram
abertas e inspecionadas; a geometria foi medida no DOM. Larguras de 320, 390,
768, 1440 e 1920 px para administrador e profissional; 390 px para os demais.

A primeira rodada esperou apenas o título e capturou alguns estados de
carregamento. As imagens `ui-dashboard-` sem `ready` são preservadas como
registro transitório, não como prova do dashboard pronto. A segunda rodada
esperou `.hca-dashboard` visível, conforme `ui-runtime-ready.json`.

Não houve overflow horizontal nos 14 dashboards medidos. Navegação lateral
no desktop e inferior para profissional/supervisor no móvel permaneceram
legíveis; ações e cards mudam conforme as capacidades. O nome longo do
paciente é truncado no seletor móvel, sem evidência de perda de autorização.
O dashboard global exibiu 114 cadastros sintéticos acumulados pelos testes.
Não se afirma cobertura visual completa das telas abertas por esses links.

## Experimentos e controles

- **UX-001:** proposta de 07h–19h para 08h–20h em 10/11. Lista informa motivo;
  diálogo de confirmação em 1440 e 390 px não informa pessoa, data e horários.
  A gravação não foi confirmada. Ver `ui-scale-review-1440.png` e `-390.png`.
  Seis avanços por Tab ficaram no diálogo; Escape fechou. Restauração de foco
  após a animação não foi medida, portanto não recebe aprovação.
- **UX-002:** família com política e consentimento pessoal habilitados.
  O POST `app_visible` ocorreu com materiais em y=858,5 e viewport de 844 px;
  o cabeçalho estava visível e o conteúdo material abaixo da dobra. A RPC
  confirmou o registro. Ver `ui-science-top-390.png`. Não é bypass de
  consentimento
  ou prova de leitura humana; é inadequação do alvo observado pela interface.
- **UX-003:** upload de PNG sintético aceito com HTTP 201; resposta abortada
  antes de chegar ao navegador. A UI diz `Failed to fetch`, lista vazia e
  mantém arquivo editável. GET subsequente respondeu 200. Não foi submetido
  outro arquivo na mesma chave e não se demonstrou substituição no servidor.
  Ver `ui-attachment-lost-response.png` e contrato estático no registro mestre.
- **UX-004:** GET de consumo retido e depois respondido com 500 sintético.
  A frase de ausência de relatos apareceu tanto pendente quanto com erro.
  Ver `ui-consumption-pending-390.png` e `ui-consumption-error-390.png`.
  O painel de Flow foi visto, mas seu próprio GET não recebeu essa injeção.
- **UX-012:** política efetiva `shareWaitSeconds=3`, consulta de avisos
  controlada com 200 e lista vazia. Após 4 s ainda havia mensagem concluída;
  após cerca de 10,5 s passou a dizer que avisos continuam sendo processados.
  Ver `ui-document-deadline-390.png`. Nenhuma entrega de provedor foi simulada
  como fato real; o experimento isola a apresentação do estado assíncrono.

Na última captura, REQ mostra simultaneamente “Atendimento parcial” e
“2/2 itens atendidos · Completo”. O contrato conta itens com recebimento
positivo, enquanto ENT conserva quantidade e divergência. É uma questão de
clareza entre níveis de resumo, registrada com UX-006/009; não é evidência de
saldo incorreto. A decisão futura deve preservar REQ sem quantidade solicitada.

## Documento atual e comparação histórica

Foi gerada ENT parcial de 14 linhas, versão 2: primeira linha expedida com
10 e aceita com 6; outras 13 linhas conferidas. A interface e o PDF preservam
uma divergência. `ui-current-ent-partial.pdf` tem quatro páginas; as quatro
renderizações `ui-current-ent-partial-page-*.png` foram inspecionadas.

Cabeçalho, protocolo, 14 linhas, resumo 13/14, quantidades, autor, versão,
cronologia, hash e aviso de verificação são legíveis, sem corte observado.
A tabela continua na segunda página; conferência e auditoria ocupam a terceira;
identificação técnica e QR continuam na quarta. Páginas 2 e 4 deixam bastante
espaço livre: oportunidade de densidade para impressão, sem falha funcional
demonstrada. O QR não foi escaneado fisicamente e não certifica assinatura.

`current-pdf-inspection.json` registra bytes, hash, páginas e texto extraído.
Os três PDFs de referência, com seis páginas ao todo, foram inspecionados
separadamente e continuam classificados como históricos. Sua aparência não
prova o comportamento do gerador atual.

## Limites explícitos

Não houve dispositivo físico, câmera real, impressão em papel, leitor de tela,
contraste medido de todos os componentes, teclado virtual, zoom de todos os
formulários ou teste humano com cuidadores. Os E2E em Pixel/WebKit são emulação
e automação, não substitutos desses aceites. As larguras de dashboard não
autorizam afirmar responsividade completa de todos os módulos.

As 35 linhas da cobertura UI marcadas como exercitadas representam exposição
aos cenários descritos, não todos os ramos de cada componente. O teste de
carregamento em consumo é limitado à requisição interceptada. Cada screenshot
tem cenário aqui ou no registro do achado; nomes de arquivos isolados não são
oráculos de sucesso.
