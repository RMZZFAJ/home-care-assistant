# Cobertura reconciliada

Inventário do commit `37cb7f85e96e551d6419871f94dd950712e2565b`:
**503 paths; 503 classificados; zero ausentes, duplicados ou exclusões.**
O pacote da própria auditoria e os quatro anexos da missão não pertencem
a esse inventário, mesmo que apareçam staged posteriormente.

`COVERAGE.csv` é a matriz canônica, com 15 colunas: path, tipo,
responsabilidade,
método, estado, semântica, runtime, visual, relevância de segurança, jornadas,
consumidores, achados, evidência, limites e notas. `journeys` e `findings`
correspondem aos campos relacionados solicitados pelo protocolo.

## Divisão e reconciliação

| Grupo de revisão | Arquivos |
| --- | ---: |
| Backend, API, auth, lib e tipos | 106 |
| Integrações e oráculos associados | 9 |
| Banco, migrations, seed e SQL | 103 |
| UI, páginas, componentes, tema e favicon | 113 |
| Documentação, imagens e protótipos de UI | 38 |
| Fontes históricas e contratos Meta comparados | 6 |
| Configuração, scripts, testes e demais artefatos | 128 |
| Total | 503 |

A frente de banco inclui 84 migrations, todas lidas e aplicadas no replay;
16 arquivos de testes SQL e três arquivos auxiliares completam seus 103 paths.
Os 106 arquivos de backend e nove integrações foram lidos integralmente com
consumidores. Na UI, 112 arquivos receberam revisão semântica e o favicon
recebeu inspeção estrutural binária. Não se usa o favicon para inflar semântica.

## Métodos declarados

438 arquivos têm `semantic_review=YES`; dois protótipos HTML têm `PARTIAL`;
27 derivados/artefatos estruturais têm `NO`; 36 têm `NOT_APPLICABLE`, incluindo
imagens e binários. Esses estados são compatíveis com tratamento apropriado
de todos os artefatos, não com a alegação de leitura semântica integral dos 503.

Métodos mais frequentes: SEMANTIC_FULL em 424 paths, estrutural simples em
35 e inspeção visual de 22 PNGs históricos. Outros métodos combinam semântica,
comparação de contratos, bytes, execução e renderização. As contagens exatas
por rótulo estão em `evidence/coverage-reconciliation.json`.

As três fontes TXT históricas e o catálogo Markdown Meta foram lidos por
inteiro; dois JSONs foram confrontados estrutural e semanticamente com os
contratos. Os dois HTMLs de protótipo receberam estrutura/interação, sem
declarar compreensão semântica de cada trecho gerado ou execução completa.
CSV/JSON de auditorias antigas foram reconciliados como derivados, não tratados
como código nem como resultados atuais de produção.

## O que runtime e visual significam

Aplicar uma migration demonstra instalação/replay, não execução de todos os
ramos SQL. Rodar um teste verifica seu oráculo e dados específicos. Arquivo
carregado pelo browser não significa todas as suas combinações examinadas.
As notas restringem cada flag; `PARTIAL` assinala explicitamente esses limites.

A exploração atual relaciona 35 paths UI a cenários renderizados, com flags
parciais. Foram inspecionados 14 dashboards carregados de seis papéis, cinco
larguras para administrador/profissional, estados de decisão/ciência/anexo/
consumo/avisos e ENT parcial. Os E2E abrangem outras jornadas, mas não equivalem
a inspeção visual manual completa de cada teste.

As 22 capturas históricas de UI foram abertas; três PDFs históricos somam seis
páginas renderizadas e inspecionadas. O PDF atual de ENT soma quatro páginas
inspecionadas separadamente. As imagens de loading da primeira rodada atual
foram mantidas e identificadas. Ver `evidence/UI_RUNTIME_REVIEW.md`.

## Lacunas e efeito sobre as conclusões

Não há path da base sem classificação. Há limites de método deliberados nos
artefatos gerados, binários e protótipos acima; não há promessa de cobertura
de todas as linhas, combinações, telas ou falhas possíveis.

Não foram executados no nível necessário para aceite: aparelho físico,
leitor de tela integral, provedor externo, smoke atual de produção,
restauração integral do remoto e benchmark representativo. DB-003 permanece
hipótese; DB-004/006/007 e limites funcionais específicos precisam de regressões
dirigidas adicionais. A hipótese temporal de DB-001 está encoberta pela falha
SQL reproduzida. Os procedimentos estão em `HOMOLOGATION_AND_ACCEPTANCE.md`.

O inventário reconciliado sustenta encerramento da investigação documental.
Esses limites impedem afirmar homologação integral ou ausência absoluta de
defeitos. As prioridades foram decididas pelo impacto e pelo nível real de
evidência, não pela percentagem de cobertura nominal.

## Reprodução da conferência

`evidence/tracked-files.txt` congela o inventário do SHA.
`evidence/build-coverage.ps1` combina as sete matrizes sem sobreposição,
relaciona achados por arquivo e recusa paths extras ou duplicados.
`evidence/validate-audit.py` confere o pacote final, o inventário contra a
árvore do commit e os blobs do produto. Nenhum desses comandos deve alterar
o index Git ou arquivos fora da pasta autorizada.
