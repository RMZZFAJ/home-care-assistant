# B1.8 — Mobile, acessibilidade e validação humana

Há méritos mensuráveis: link de salto recebe primeiro Tab e Enter foca main;
diálogo decisório mantém foco entre seus três controles; matriz pode receber
foco e rolar com setas; drawer protege edição suja; descartar devolve foco a
Novo item. Esses comportamentos não eliminam os problemas abaixo.

## Testes atuais e resultados

- **Método / contexto:** Painel/REQ320–1920, demais páginas390/1440; **Resultado
observado:** Sem overflow global nas amostras comuns da etapa visual;
**Alcance:** Não inclui todo conteúdo longo ou cada overlay.
- **Método / contexto:** REQ revisão320, observação válida com300 caracteres
contínuos; **Resultado observado:** documentWidth2190 para viewport320;
**Alcance:** Defeito de contenção/reflow demonstrado antes de submit; nenhum
dado gravado.
- **Método / contexto:** Diálogo de escala,9Tabs; **Resultado observado:** Todos
os focos permanecem dentro, ciclando Fechar/Voltar/Confirmar; **Alcance:**
Trap correto; não prova resumo decisório suficiente.
- **Método / contexto:** Escape do diálogo, esperar500ms; **Resultado
observado:** Foco fica em BODY; próximo Tab volta ao link de salto;
**Alcance:** Retorno ao gatilho Aprovar alteração não ocorre.
- **Método / contexto:** Drawer: Continuar editando, esperar250ms; **Resultado
observado:** Texto preservado; foco em BODY; **Alcance:** Segunda Escape sem
devolver foco não abre aviso na primeira prova; recuperar foco no campo
permite fechamento seguro.
- **Método / contexto:** Descartar no drawer; **Resultado observado:** Foco
retorna a Novo item após250ms; **Alcance:** Contraprova de ausência universal
de restauração.
- **Método / contexto:** Matriz390, foco na região e3 setas; **Resultado
observado:** scrollLeft0→13 no instante medido; **Alcance:** Há acesso por
teclado; velocidade/alcance humano não medidos.
- **Método / contexto:** Rodapé profissional390 no fundo real; **Resultado
observado:** Todos os botões terminam acima de navTop776; Concluir termina725;
**Alcance:** Sobreposição sugerida por captura full-page foi refutada para
esta REQ.
- **Método / contexto:** Seletor Mês em390; **Resultado observado:** Tela
continua em dia único; **Alcance:** Fonte aplica variante de dia abaixo1024;
rótulo de modo é inconsistente.
- **Método / contexto:** Fonte raiz200% em320; **Resultado observado:** Página
COM mantém largura320, cresce verticalmente; **Alcance:** Estresse CSS; não é
zoom nativo nem certificação WCAG1.4.4.
- **Método / contexto:** Forced colors/reduced motion no browser; **Resultado
observado:** Captura e media query disponíveis; redução reconhecida;
**Alcance:** Emulação; não equivale a alto contraste do Windows ou aparelho
físico.
- **Método / contexto:** axe em6 superfícies; **Resultado observado:** Sem
violações detectadas, com itens inconclusivos registrados; **Alcance:** Login,
permissões, REQ revisão, histórico leitor, ENT leitor e BAL leitor; sem regras
desabilitadas.
- **Método / contexto:** Quatro PDFs atuais /8 páginas; **Resultado observado:**
Estrutura de tags e Lang ausentes; páginas visualmente inspecionadas;
**Alcance:** Risco de leitura/estrutura; leitor de tela PDF e ordem real
NOT_VERIFIED.

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
[W3C2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
.
Não classificar todo ícone ou input interno42px como violação.

Não houve NVDA, VoiceOver, TalkBack, leitor PDF, hardware, pessoa com baixa
visão ou limitação motora. ariaSnapshot é árvore de acessibilidade exportada,
não áudio ouvido por leitor de tela. Anúncio real, ordem de leitura e fadiga
de foco continuam NOT_VERIFIED.

## Plano de teste humano e físico proposto

- **Sessão / participantes:** Técnicas/profissionais,3–5 pessoas com
familiaridade variada; **Tarefa e condição:** Emitir REQ de1/5 materiais e um
extra, interromper, retomar e explicar ciência versus recebimento; **Evidência
e critério futuro:** Observar hesitação, retrabalho e interpretação sem
instrução do auditor; nenhuma quantidade solicitada introduzida.
- **Sessão / participantes:** Família responsável e substituto; **Tarefa e
condição:** Ciência, COM compra/doação, recebimento/validação e ENT;
**Evidência e critério futuro:** Identificar o que está salvo, disponível, em
trânsito e quem age a seguir; sem fundir etapas.
- **Sessão / participantes:** Supervisão e família; **Tarefa e condição:**
Solicitar e decidir adiamento BAL em plantão/noturno; **Evidência e critério
futuro:** Responsável, janela, fuso e prazo original/proposto explicados antes
de confirmar.
- **Sessão / participantes:** Administrador local e global; **Tarefa e
condição:** Rever escala, permissão e proposta de configuração; **Evidência e
critério futuro:** Explicar antes/depois sem JSON/UUID; aprovador distinto e
negativa mantidos.
- **Sessão / participantes:** Leitor; **Tarefa e condição:** Localizar documento
antigo e PDF, acessar aviso; **Evidência e critério futuro:** Não oferecer
comando indevido; histórico e retorno de filtro funcionais.
- **Sessão / participantes:** iPhone/Safari com VoiceOver; **Tarefa e
condição:** REQ, ENT divergente, BAL2 etapas, share/PDF e keyboard virtual;
**Evidência e critério futuro:** Rótulos/erros lidos no campo, foco
recuperado, botão acima da área segura/teclado.
- **Sessão / participantes:** Android/Chrome com TalkBack; **Tarefa e
condição:** Mesmas tarefas com câmera, foto e código manual; **Evidência e
critério futuro:** Alternativa manual sempre disponível, conversão
apresentada, sem dependência exclusiva de gesto.
- **Sessão / participantes:** Windows/NVDA e alto contraste; **Tarefa e
condição:** Matrizes, dialogs, erros e PDF; **Evidência e critério futuro:**
Heading/tabela/ordem e retorno ao gatilho corretos; PDF possui idioma e
estrutura navegável.
- **Sessão / participantes:** Baixa visão e zoom nativo200/400%; **Tarefa e
condição:** Nome longo, observação/URL contínua, filtros e revisão;
**Evidência e critério futuro:** Reflow preserva leitura e ações sem rolagem
horizontal global indevida.
- **Sessão / participantes:** Rede móvel ruim e interrupção do app; **Tarefa e
condição:** Perder resposta depois de commit, fechar aba, reabrir em outro
dispositivo; **Evidência e critério futuro:** Mesma tentativa recuperável,
nenhum arquivo substituído/duplicação, alcance do rascunho explicado.
- **Sessão / participantes:** Impresso/ficha física; **Tarefa e condição:**
Fotografar, anexar, imprimir PDF e reler QR autorizado; **Evidência e critério
futuro:** Texto legível, versão identificada, QR não expõe conteúdo privado
nem leva fixture ao remoto.

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
