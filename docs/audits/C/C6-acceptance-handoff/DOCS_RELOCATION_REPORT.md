# Reorganização documental e preservação

As divisões A, B/B1–B8, C/C0–C6 e D reservada foram criadas efetivamente.
Pacotes inteiros foram movidos com git mv; contratos atuais estão em current,
decisões em decisions, execuções/protótipos datados em archive/_historical.
O [mapa completo](../../../RELOCATION_MAP.csv) conserva 1932 caminhos iniciais,
classificação, consumidor, ação, razão e hashes antes/depois.

## Intervenções e histórico preservado

32 movimentos de conjuntos/arquivos. A primeira passagem ajustou 194 links em
73 documentos. [Log de links](EDITORIAL_LINK_EDITS.csv) e
[hashes editoriais](EDITORIAL_HASH_CHANGES.csv) distinguem alteração de
endereço
de conclusão histórica. [Edições de orientação](CURRENT_DOCUMENT_EDITS.csv)
registram atualização viva e formatação dos quatro inputs humanos; cópias
exatas
anteriores estão em C0/inputs com hash. Não recalcular manifesto A/B para
parecer que o experimento ocorreu na nova árvore.

O índice B foi temporariamente aninhado pelo comportamento de git mv com
diretório já existente. [Tentativas](MIGRATION_ATTEMPTS.md) e
[execução](migration-execution.json) mostram correção sem replay, comparação
por hash e nenhum efeito no produto. Não se oculta falha do instrumento como
defeito do sistema. A validação final é independente do simples retorno do
move.

ACCEPTANCE UI foi classificada como matriz histórica após leitura; o
inventário
UI gerado ficou no caminho fixo como referência datada. Guias normativos
válidos
foram mantidos e qualificados. Meta/Flows JSON, referências V3, PDFs/amostras
e
inventário JSON não foram reescritos. Não houve exclusão de documento
original:
nenhum candidato descartável foi suficientemente demonstrado para remoção.
Conservar histórico e arquivar atende à limpeza segura, sem inventar
exclusões.

## Referências e limites

Links editoriais de relatórios foram rebaseados à nova profundidade;
referências
a src e contratos atuais devem resolver. Evidências brutas, JSON/CSV/logs,
scripts históricos e manifestos conservam literais antigos como dados de
execução. O resolver/mapa permite consultar esses valores sem reexecutar
probes.
Os [detalhes de links](LINK_VALIDATION_DETAILS.csv) discriminam caminhos
atuais,
contexto histórico resolvível e exceções não comprovadas; o resumo final não
chama exclusão de histórico de “zero links quebrados”.

Referências GitHub ao SHA histórico continuam recuperáveis pelo Git. Endereços
da branch foram atualizados quando editoriais conhecidos; não se comprovou um
censo de bookmarks externos e GitHub não fornece redirecionamento HTTP de cada
arquivo movido. O mapa é a compatibilidade documental, sem duplicar centenas
de fontes. URLs da aplicação, código, migrations e consumidores de runtime
ficaram intactos. Scripts de geração com destinos antigos não foram executados
ou repontados para sobrescrever o novo acervo; D0 exige guardas antes de
reutilizar.

[validation-report.json](validation-report.json) conferiu todos os bytes
protegidos, fontes, links e matrizes. SHA final e push são verificados no Git;
manifesto C exclui a si próprio e não tenta conter o hash do commit que o
cria.
Nenhum teste funcional, reset, restore, provedor, deploy deliberado, PR ou
merge.

As cinco cópias brutas de entrada foram encapsuladas em gzip com roundtrip
byte a byte e SHA original preservado em INPUTS_PROVENANCE/RAW_INPUT_REPACK.
Isso preserva espaços/newlines originais sem afrouxar lint ou git diff --check.
As tabelas largas de C foram convertidas em registros rotulados, mantendo cada
célula; CSVs continuam índices derivados, não especificação concorrente.

O inventário estático dos dois protótipos HTML encontrou duas referências:
um fragmento existente e um fragmento dinâmico não verificado.
[Detalhes HTML](HTML_REFERENCE_DETAILS.csv) distinguem esse contexto histórico
de navegação atual; nenhum JavaScript foi executado ou HTML histórico editado.
