# Aparência canônica — Modelo Integral

Ordem do responsável em 09/11/2026, incorporada à missão D-B. O
[HTML integral](../../Home_Care_Assistant_Modelo_Integral.html) substitui Fluent
UI como referência obrigatória de aparência, composição e experiência de todo
o sistema, incluindo recursos existentes e futuros. Não reduzir, resumir,
retirar ou ocultar funcionalidades para caber no protótipo.

Para E01–E03 e seus padrões compartilhados, a revisão posterior de 13/11/2026
é o [Lote L1](../../HCA_L1_LOTE_CODEX_E01_E03.md):
[laboratório v3](../../hca-laboratorio-01-v3-final.html) **mais**
[comentários v3](../../hca-l01-v3-comentarios.json). O HTML antecede os
comentários; as decisões posteriores prevalecem. A aparência impressa permanece
na especificação documental aprovada, sem copiar o PDF simulado do laboratório.

## Precedência

Esta ordem posterior substitui as orientações visuais conflitantes. Auditorias,
capturas e decisões anteriores permanecem históricas, sem aprovar a nova UI.
O HTML governa paleta, tipografia, espaçamento, superfícies, cabeçalho, navegação,
responsividade, componentes, textos de apoio, estados e avisos. Recursos ausentes
recebem componentes reutilizáveis da mesma linguagem, sem misturar aparências,
reexportar a API Fluent ou apenas recobrir seus componentes com CSS.

Auth, API, banco, capacidades por paciente, idempotência, recuperação e fatos
operacionais conservam os contratos reais. Permissões e dados demonstrativos
do HTML não são regras novas de negócio. Não copiar localStorage, simulações,
botões inertes ou decisões de exemplo para substituir funcionalidades reais.
Migração incremental em Draft não significa aprovação da mistura transitória:
a conclusão exige eliminar consumidores, provider/Griffel, estilos e dependência
Fluent, além de comprovar a paridade integral.

## Fundação

Fundo #f4f6f5, papel branco, texto #193332, verde principal #156f66, cabeçalho #173b3a;
estados semânticos distintos. Inter com os fallbacks do HTML, sem baixar fonte
externa automaticamente. Ícones com viewBox 24 e traço 1.7. Breakpoints do modelo:
1500,1150,850,500px. Base UI é a fundação de comportamento sem aparência para
overlays e controles compostos; aparência própria do projeto, sem tema pronto.
Controles simples usam HTML nativo. Dependências precisam de consumidor real.
[Biblioteca](https://base-ui.com/react/overview/about) e
[portais/Safari](https://base-ui.com/react/overview/quick-start) fundamentam
comportamento, sem substituir a direção visual.

## Fichas e Andamentos

REQ/COM/ENT/DEV/BAL adotam cabeçalho e progresso próprios, ações legítimas e abas:
Visão geral, Materiais, Comunicações, Arquivos gerados, Anexos e Auditoria quando
autorizada. Materiais reúne o acompanhamento operacional de cada domínio.
Identificação técnica e registros preservados ficam em Mais. O histórico de
acesso das
fichas exige leitura da ficha e a competência própria document.access.read;
não exige capacidade de auditoria administrativa. Novas exibições da mesma
pessoa e versão são agrupadas em 20 minutos, sem reescrever registros antigos.
Auditoria
usa sua autorização e seu escopo próprios. Conteúdo adicional deve continuar
completo e alcançável. Revisões não herdam inputs de criação. Troca de aba
conserva contexto, versão, edição e tentativa incerta.

Visão geral reúne Andamentos e próxima providência factual. Linha cronológica
do primeiro ao mais recente, filtro de fatos automáticos/registros humanos e
paginação completa. Marcos de progresso não determinam cronologia. A etapa
relacionada é apenas atributo. Auditoria continua separada; nem todo log vira
andamento. Autores, instantes, estados e consequências vêm dos fatos reais.

Registrar andamento é função real integrada às quatro fichas: texto até 2000 caracteres,
categoria, etapa opcional, referências autorizadas, autoria/instante gerados
no servidor/banco e confirmação recuperável da mesma intenção. Categorias:
Registro complementar, Providência, Contato e Pendência. Exibir texto com escape,
sem executar HTML. Referência não concede acesso a ficha/paciente alheio.
Registro complementar não muda conteúdo original, estoque, atendimento, ciência,
recebimento, snapshots, hashes ou arquivos/versões emitidos anteriormente.
Implementação e provas: [Andamentos persistidos](../audits/D/D-B/DOCUMENT_PROGRESS.md).
A composição em abas e os marcos factuais têm implementação incremental em
[Fichas em abas](../audits/D/D-B/DOCUMENT_TABS.md). Paridade integral do
cabeçalho e das demais superfícies continua sujeita à conclusão da migração.
O [incremento de cabeçalhos](../audits/D/D-B/DOCUMENT_HEADER.md) implementa
identificação, grade, faixa de progresso e controles reais na barra de ações;
não substitui o aceite das composições e superfícies restantes.

## Preservação e aceite

Faixa de atenção, próxima providência e contagens usam fatos atuais autorizados;
falha ou leitura antiga não fabrica pendência, conclusão ou saúde. Textos de
apoio explicam consequência e recuperação. Aviso visto, arquivo gerado, ciência,
recebimento e efeito de estoque permanecem atos distintos.

Preservar formulários/rascunhos, recuperação entre sessões, listas/paginação,
histórico/versões, filtros, permissões, contraprovas, estoque, PDFs técnicos,
assinatura/TSA/verificação, anexos, PWA/cache privado/ausência de replay, Push,
notificações, guias, suporte, backup e monitoramento. A aparência dos PDFs foi
autorizada no [complemento documental de 11/11/2026](../documents/03_ESPECIFICACAO_DOCUMENTAL_APROVADA.md).
Sua referência própria não altera este modelo da aplicação. O export
demonstrativo deste HTML não substitui os arquivos oficiais. Sem produção
ou ativação de transportes externos.

O [registro adicional](../audits/D/D-B/UI_MODEL_ACCEPTANCE.csv) não substitui
os 105 critérios D-B. Exigir comparação com o HTML em cinco viewports, teclado,
foco/retorno, disabled, contraste/forced-colors, zoom e movimento reduzido;
regressões dos consumidores e CI do SHA publicado. Conferir todos os recursos
reais, inclusive os ausentes do protótipo. Screenshot isolado não prova paridade.

Original 222275 bytes, SHA-256
`2f66791f0a9f8fc19ef1a021bdcce8a1bcca25264641fecddb4d4391a0ace9ff`.
Inventário embutido: 58 superfícies, baseline histórico 827531e. Seus números de
migrations/Preview não são o estado atual. Renderização isolada sem rede, sem
importar dados fictícios. Autoridade visual aprovada; migração e Andamentos
permanecem sujeitos à implementação e comprovação.
