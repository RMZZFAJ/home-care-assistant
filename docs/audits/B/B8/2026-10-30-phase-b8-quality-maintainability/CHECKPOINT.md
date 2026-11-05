# Checkpoint B8

## Autorização e baseline

Ordem complementar de 1041 linhas lida integralmente. B7 permanece encerrada.
Branch local/remota `audit/phase-b` em
`294382b56e10c7c7c38a4d94bc91bacffb01ee3f`; master local/remota em
`34dcb835c5c49068e0417f7306eb4e501aa868bc`. Árvore inicialmente limpa.

Exceções autorizadas: correções pontuais dos avisos, novos instrumentos deste
pacote, índice phase-b, commit/push e preview automático. Demais limites no
README. Não há autorização para correções funcionais, C ou D.

## Atividade prévia — concluída

PyMuPDF 2.0 e fonttools 4.68.0 instalados no Python 3.13.12 da `.venv`. `import
pymupdf` e `from fontTools.ttLib import TTFont` confirmados. Seleção explícita
de `.venv/Scripts/python.exe` no VS Code eliminou seis diagnósticos Pylance sem
reinstalação, exclusão ou mudança de scripts. Os caminhos B1 reais usam
`inspect-pdfs.py`. Três linhas B4 receberam somente crases; lint passou. Painel
Problems observado: “Não foi detectado nenhum problema no workspace”. Sem
relatório forense adicional para esta manutenção simples.

## Investigação e consolidação — concluídas

- Q1–Q9, M1–M7 e revisão transversal encerrados. Guias Next instalados
  consultados; Node24.22.0 e Python3.13.12/.venv. Sem subagentes.
- 156 IDs A–B7 em 119 famílias,37 relações agrupadas; nenhum ID omitido.
  Matriz21campos,17 processos, seis pessoas e 22 exceções. Não é planoC.
- Nove registros: três novos de qualidade e seis revalidações; seisP2/trêsP3.
  Sem novoP1; NO-GO e os P1s anteriores preservados.
- 20 observações dirigidas: baseline PDF: cinco PASS, texto vazio: cinco PASS,
  título errado: um FAIL esperado; cinco probes de navegador e quatro casos SQL
  readonly. Extração independente: sete saídas mutantes sem texto. Tentativas de
  cache descartadas, atestação e contraprovas em
  evidence/LIMITATIONS_AND_ATTEMPTS.md.
- QA-001 reproduzido no helper real com DOM sintético; não se mede frequência.
  CI apenasGET mantém 40656069166 falha. Sem suíte global/build/replay novo.
- Inventário da árvore 294382b: 2258 arquivos,41 módulos de teste/suporte,16
  SQL; 17 arquivos unitários, sete integrações, 11 specs. Declarações 82/31/36
  AST não são casos executados. Descoberta 120 casos sem servidor/globalSetup.
- 263 módulos/1043 referências, incluindo reexports e imports dinâmicos.
  AppWorkspace KEEP por workspace.tsx:30; quatro módulos DELETE_CANDIDATE, cinco
  SVG DEPRECATE_CANDIDATE; /inventariosKEEP. Nenhuma remoção.
- 230 scripts localizados por padrões, não 230 revisões completas.31
  dependências diretas 14 runtime/17 dev. Advisory B7 reutilizado; sem
  install/auditfix.
- Dez documentos vigentes/34 links inline locais existentes, drift registrado.
  B4 apenas três linhas com crases; CSV/provas/manifesto antigo preservados.
- 125 âncoras e 28 referências anteriores por hash LF. Código, 84 migrations,
  testes/scripts e 394 arquivos protegidos preservados. requirements-audit.txt
  foi adicionado antes da B8, hash igual ao baseline; não é diff do produto.
- Só SQL de constantes READ ONLY, sem linha de paciente/DML, fixture, reset,
  restore, Auth/Storage remoto ou envio. Sem PR/merge ou promoção de produção.
- Aparelhos, AT, impressão, rede móvel real, provedores e restore continuam sem
  homologação. Sem WCAG/LGPD/SLO completos declarados.
- 20 critérios de conclusão endereçados. Não há domínio independente novo que
  justifique outro grupo B. A/B1–B8 encerradas; C/D não iniciadas.

## Validação e publicação

Markdown, ESLint dos instrumentos, TypeScript dos probes e sintaxe JS/Python
passaram. package-validation.json reconcilia arquivos, matrizes, referências,
links, limites, escopo e hashes; MANIFEST.json usa texto normalizado LF. Não
houve repetição funcional após alterações exclusivamente documentais.

O encerramento será publicado na mesma branch após registrar este snapshot.
Commit/push documental e preview automático estão autorizados, sem alterar
provedores. Conferir a referência efetiva por Git e o resultado remoto; o SHA
que determina este conteúdo não pode constar de si próprio. Nenhuma pendência
investigativa permanece. Acompanhar preview e confirmar master/produção/árvore
antes de comunicar conclusão da publicação.
