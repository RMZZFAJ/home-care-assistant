# C0 — baseline, fontes e guardas

Reconhecimento de 30/10/2026. Branch `audit/phase-b`, HEAD de entrada
`227f26ca695a3d01512a854f4b19f2639b91ba87`, master
`34dcb835c5c49068e0417f7306eb4e501aa868bc`. Produto auditado
`37cb7f85e96e551d6419871f94dd950712e2565b`; comparação de produto sem
diferenças.
O remoto de Git é `RMZZFAJ/home-care-assistant`. Nenhum estado de produção foi
inferido de Git; último deploy produtivo nesta missão: `NOT_VERIFIED`.

## Autoridade e leituras

A interposição do responsável substituiu o pedido B5, cujo anexo já continha
a ordem C. Os quatro arquivos da raiz foram lidos integralmente; as duas
cópias anexadas da ordem têm o mesmo texto após normalização de newline.
[Proveniência](INPUTS_PROVENANCE.csv) guarda hashes e cópias originais em
inputs.
Esses quatro arquivos eram o único trabalho local preexistente não rastreado.
Sua movimentação e publicação documental foram expressamente autorizadas.

AGENTS, portal B, executivos, registros e handoffs A/B são fontes
diagnósticas;
decisões humanas mais recentes prevalecem sobre recomendações antigas.
Os documentos vivos e guias de UI são contratos/descrições sujeitos aos
desvios
comprovados. Não reutilizar autorização antiga de produção.

## Inventário anterior a movimentos

[baseline.json](baseline.json) e o
[inventário](DOCUMENTATION_MIGRATION_INVENTORY.csv)
registram 1.932 arquivos: 1.800 em pacotes A/B, 78 execuções/evidências
históricas, 30 guias, 11 contratos atuais, nove referências e quatro entradas
humanas. Nenhum UNKNOWN. Há 3.025 ocorrências de caminhos e 1.623 links
Markdown
registrados em CSV próprio. Ocorrência literal não significa hiperlink vivo.
Os arquivos gerados por C não integram esse denominador inicial.

Confirmados por leitura: 84 migrations e 84 entradas no guard histórico.
Os hashes de todos os arquivos versionados fora de docs, README e AGENTS ficam
no baseline para comparação final. Não se limita a src ou a uma amostra.

## Plano de movimentos e exceções

Mover pacotes inteiros para A, B/B1–B8 e _historical; criar C0–C6 e D
reservada.
Mover contratos de raiz docs para current. Arquivar evolução, execução UI,
capturas e protótipos datados. Manter guias UI e inventory.json no endereço
consumido por ferramentas. Manter docs/meta e docs/references como
referências,
com índice que distingue proposta de publicação externa.

Modificar apenas links editoriais necessários em relatórios fora de evidence,
registrando substituições e hashes. Evidence, CSVs de achados, contratos SQL,
PDFs e manifestos históricos conservam bytes. Caminhos dentro de provas e
scripts datados são dados de execução: o mapa de relocação resolve a consulta;
não executar esses scripts a partir da nova localização sem adaptação futura.
Ferramentas vivas com caminho fixo terão exceção ou reparo exclusivamente de
referência documental quando seguro. Nunca usar reexecução para recriar prova.

## Proporcionalidade

C não exige Docker ativo: nenhuma prova funcional nova será produzida. Não se
executa prepare, reset, seed, SQL, geração de PDF ou E2E. Node/npm de versão
são
necessários apenas aos verificadores documentais. Python da .venv existente
executa instrumentos de inventário/consolidação sem dependências novas.
Nenhuma leitura de .env.local, dados privados ou credenciais de serviços.
