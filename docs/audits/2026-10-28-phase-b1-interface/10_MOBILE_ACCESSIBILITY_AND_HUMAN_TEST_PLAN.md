# B1.8 — Mobile, acessibilidade e validação humana

Há méritos mensuráveis: link de salto recebe primeiro Tab e Enter foca main;
diálogo decisório mantém foco entre seus três controles; matriz pode receber
foco e rolar com setas; drawer protege edição suja; descartar devolve foco a
Novo item. Esses comportamentos não eliminam os problemas abaixo.

## Testes atuais e resultados

| Método / contexto | Resultado observado | Alcance |
| --- | --- | --- |
| Painel/REQ320–1920, demais páginas390/1440 | Sem overflow global nas amostras comuns da etapa visual | Não inclui todo conteúdo longo ou cada overlay |
| REQ revisão320, observação válida com300caracteres contínuos | documentWidth2190 para viewport320 | Defeito de contenção/reflow demonstrado antes de submit; nenhum dado gravado |
| Diálogo de escala,9Tabs | Todos os focos permanecem dentro, ciclando Fechar/Voltar/Confirmar | Trap correto; não prova resumo decisório suficiente |
| Escape do diálogo, esperar500ms | Foco fica em BODY; próximo Tab volta ao link de salto | Retorno ao gatilho Aprovar alteração não ocorre |
| Drawer: Continuar editando, esperar250ms | Texto preservado; foco em BODY | Segunda Escape sem devolver foco não abre aviso na primeira prova; recuperar foco no campo permite fechamento seguro |
| Descartar no drawer | Foco retorna a Novo item após250ms | Contraprova de ausência universal de restauração |
| Matriz390, foco na região e3setas | scrollLeft0→13 no instante medido | Há acesso por teclado; velocidade/alcance humano não medidos |
| Rodapé profissional390 no fundo real | Todos os botões terminam acima de navTop776; Concluir termina725 | Sobreposição sugerida por captura full-page foi refutada para esta REQ |
| Seletor Mês em390 | Tela continua em dia único | Fonte aplica variante de dia abaixo1024; rótulo de modo é inconsistente |
| Fonte raiz200% em320 | Página COM mantém largura320, cresce verticalmente | Estresse CSS; não é zoom nativo nem certificação WCAG1.4.4 |
| Forced colors/reduced motion no browser | Captura e media query disponíveis; redução reconhecida | Emulação; não equivale a alto contraste do Windows ou aparelho físico |
| axe em6superfícies | Sem violações detectadas, com itens inconclusivos registrados | Login, permissões, REQ revisão, histórico leitor, ENT leitor e BAL leitor; sem regras desabilitadas |
| Quatro PDFs atuais /8páginas | Estrutura de tags e Lang ausentes; páginas visualmente inspecionadas | Risco de leitura/estrutura; leitor de tela PDF e ordem real NOT_VERIFIED |

As seis superfícies axe incluem a repetição do login em contexto explícito:
a primeira tentativa usava browser.newPage, incompatível com a ferramenta.
Não foi resultado de acessibilidade. A primeira tentativa da jornada local
usou paciente sem a proposta de prova; o diálogo foi repetido na fixture
histórica correta. Todas essas tentativas permanecem nos JSONs.

Evidências: [b18-accessibility.json](evidence/b18-accessibility.json),
[b18-followup.json](evidence/b18-followup.json),
[pdf-inspection.json](evidence/pdf-inspection.json). A falha de reflow não é
detectada pelo resultado axe zero; por isso não se emite selo de conformidade.

## Critérios e limites de método

320CSSpx é teste de reflow, inclusive como aproximação do espaço de1280 a400%.
Não foi executado zoom nativo400% no navegador real nem teclado virtual.
Não confundir deviceScaleFactor, pinch, CSS font-size e zoom: afetam coisas
diferentes. A raiz200% foi usada só como estresse complementar.

Alvo mínimo AA é24×24CSSpx, com exceções de espaçamento/equivalência/inline;
44px é meta de conforto desta operação. Labels podem ampliar área de checkbox
menor. Inativos têm exceção de contraste; estado efetivo de permissão ainda
precisa ser legível. A referência normativa e sua explicação estão em
[W3C2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
Não classificar todo ícone ou input interno42px como violação.

Não houve NVDA, VoiceOver, TalkBack, leitor PDF, hardware, pessoa com baixa
visão ou limitação motora. ariaSnapshot é árvore de acessibilidade exportada,
não áudio ouvido por leitor de tela. Anúncio real, ordem de leitura e fadiga
de foco continuam NOT_VERIFIED.

## Plano de teste humano e físico proposto

| Sessão / participantes | Tarefa e condição | Evidência e critério futuro |
| --- | --- | --- |
| Técnicas/profissionais,3–5pessoas com familiaridade variada | Emitir REQ de1/5materiais e um extra, interromper, retomar e explicar ciência versus recebimento | Observar hesitação, retrabalho e interpretação sem instrução do auditor; nenhuma quantidade solicitada introduzida |
| Família responsável e substituto | Ciência, COM compra/doação, recebimento/validação e ENT | Identificar o que está salvo, disponível, em trânsito e quem age a seguir; sem fundir etapas |
| Supervisão e família | Solicitar e decidir adiamento BAL em plantão/noturno | Responsável, janela, fuso e prazo original/proposto explicados antes de confirmar |
| Administrador local e global | Rever escala, permissão e proposta de configuração | Explicar antes/depois sem JSON/UUID; aprovador distinto e negativa mantidos |
| Leitor | Localizar documento antigo e PDF, acessar aviso | Não oferecer comando indevido; histórico e retorno de filtro funcionais |
| iPhone/Safari com VoiceOver | REQ, ENT divergente, BAL2etapas, share/PDF e keyboard virtual | Rótulos/erros lidos no campo, foco recuperado, botão acima da área segura/teclado |
| Android/Chrome com TalkBack | Mesmas tarefas com câmera, foto e código manual | Alternativa manual sempre disponível, conversão apresentada, sem dependência exclusiva de gesto |
| Windows/NVDA e alto contraste | Matrizes, dialogs, erros e PDF | Heading/tabela/ordem e retorno ao gatilho corretos; PDF possui idioma e estrutura navegável |
| Baixa visão e zoom nativo200/400% | Nome longo, observação/URL contínua, filtros e revisão | Reflow preserva leitura e ações sem rolagem horizontal global indevida |
| Rede móvel ruim e interrupção do app | Perder resposta depois de commit, fechar aba, reabrir em outro dispositivo | Mesma tentativa recuperável, nenhum arquivo substituído/duplicação, alcance do rascunho explicado |
| Impresso/ficha física | Fotografar, anexar, imprimir PDF e reler QR autorizado | Texto legível, versão identificada, QR não expõe conteúdo privado nem leva fixture ao remoto |

Usar ambiente de homologação autorizado e dados fictícios; convite/contato de
participante não deve ir para Git. Gravação de sessão depende de consentimento
do participante e armazenamento próprio; esta auditoria não enviou convites.
Definir sucesso por compreensão e conclusão segura, não por média de cliques.

## Segunda passada e contraditório

Corrigir foco exige restaurar o gatilho ou alternativa lógica quando ele
desaparecer, sem mover foco em todo refresh. Corrigir reflow exige testar
conteúdo legítimo contínuo, sem truncar dado operacional silenciosamente.
Barra fixa adicional pode piorar o rodapé que já coube na prova real.

PDF acessível exige mais que extrair texto; tags, idioma, headings/tabelas e
ordem precisam de leitor real. Zero achados automáticos não substitui esses
testes, nem transforma preferência estética em violação normativa.
