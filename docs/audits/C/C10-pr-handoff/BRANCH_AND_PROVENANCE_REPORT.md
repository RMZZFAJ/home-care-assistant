# Branch, origem e preservação

Baseline confirmado por fetch/read-only em 04/11/2026: audit/phase-b e
origin/audit/phase-b em 992c6303e9da158073f2e3e75957d0faa49fa4ee;
master/origin em 34dcb835c5c49068e0417f7306eb4e501aa868bc;0 atrás/18 à frente.
Nenhum PR anterior aberto/fechado para esse head/base foi encontrado na
consulta inicial.

Árvore inicial tinha apenas16 adições staged do kit fornecido. Essas adições
foram incorporadas sob autorização atual, sem descarte de trabalho estranho.
Snapshot de 2452 arquivos tracked e seus bytes no baseline fica em
evidence/BASELINE.json. A cópia é para detecção de mudança, não backup do
banco.

Comparação entre base funcional37cb7f85e96e551d6419871f94dd950712e2565b e HEAD
inicial mostrou zero diferença em src/Supabase/tests/scripts/workflow/
package.json/lockfile. O diff anterior master→audit tinha três apoios fora de
docs: .gitignore ignora .venv/__pycache__; .vscode usa intérprete Python local
e trata Markdown como texto para Tailwind; requirements-audit fixa
PyMuPDF/fonttools para inspeção. Não são mudanças novas desta missão e foram
preservadas.

O conteúdo de entrada está em INPUT_PROVENANCE:87 entradas entre kit e
Markdown/CSV canônicos anteriores, com hash, tamanho e arquivo exato quando
textual. O kit tinha16 arquivos, sendo sete Markdown, HTML e oitoPNG. O
arquivo07 citado no leia-primeiro não estava presente; não foi inventado.
KIT_RELOCATION registra cada origem/destino. Nenhuma evidência histórica A/B
foi movida ou alterada nesta parte2.

SHA final do pacote é o commit/ref publicado e o head do Draft PR; um hash não
pode ser gravado como hash do próprio conteúdo. O manifesto exclui a si, e a
consulta GitHub posterior registra a publicação/CI do candidato. Master não
recebe merge e nenhuma branch é excluída. Estado produtivo remoto não foi
reinspecionado; permanece NOT_VERIFIED nesta missão, sem promoção/deploy
deliberado. Preview automático eventualmente iniciado é efeito da integração
existente, separado de aceite de produto ou operação real.
