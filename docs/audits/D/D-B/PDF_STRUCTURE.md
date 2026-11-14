# D4.11 — estrutura de leitura do PDF V10

V10 acrescenta árvore semântica aos novos exemplares REQ/COM/ENT/BAL, sem
redesenho. Idioma pt-BR, título do documento e preferência por exibir esse título
acompanham Document, H1, H2, parágrafos e tabelas Table/TR/TH/TD. Cabeçalhos TH
têm escopo de coluna. Cada trecho marcado aponta para sua página e MCID; o
ParentTree faz o vínculo inverso. QR tem Figure e descrição alternativa.

Rótulos e valores de cada campo permanecem juntos na ordem lógica, inclusive
em duas colunas. Células que atravessam páginas continuam no mesmo TD. Cabeçalho
de tabela repetido, fundo, marca visual e rodapé recorrentes são artefatos;
não duplicam a leitura. A marca de exemplo fictício, quando existente, mantém
uma ocorrência semântica. Não se alteram dados, fontes, posição ou estilo.

As relações usadas seguem as técnicas
[PDF6 para tabelas](https://www.w3.org/WAI/WCAG22/Techniques/pdf/PDF6) e
[PDF9 para títulos](https://www.w3.org/WAI/WCAG22/Techniques/pdf/PDF9), e a
[estrutura lógica descrita pela PDF Association](https://pdfa.org/download-area/cheat-sheets/LogicalStructureObjects.pdf).
Isso não constitui certificação PDF/UA ou aceite com tecnologia assistiva.

## Emissão, segurança e compatibilidade

A reserva autenticada V10 conserva autorização, sessão, trava, hash, versão
e snapshot do contrato anterior. A migration só amplia dois guards de revisão
e cria o novo ponto de entrada com grants explícitos. A entrada V9 permanece
igual. Intenções anteriores recuperam sua revisão original; uma emissão nova
usa10. Nenhum arquivo antigo recebe tags ou assinatura retroativas.

O gate de conteúdo exige estrutura V10 consistente antes de disponibilizar o
exemplar, inclusive depois da assinatura. Confere pais, filhos, escopo TH,
figura, ParentTree, MCIDs presentes nos streams e cobertura dos operadores de
pintura. Ele interpreta a gramática estrita produzida pelo próprio renderizador;
não é um parser geral de uploads. O verificador público mantém sua fronteira
separada. Falha não gera fallback sem tags, B-B ou arquivo sem assinatura.

## Provas executadas

- 44 testes dirigidos de PDF passaram:9 novos e35 anteriores. Os9 foram
  reconfirmados depois de tornar a geração dos baselines reproduzível.
- 12 regressões com Auth real passaram:5 novas e7 anteriores. Os quatro tipos,
  intenção anterior, concorrência, replay, outro paciente, recusa de capability
  e grants foram confrontados com eventos/estoque e snapshots canônicos.
- 18 cenários de produção Chromium passaram nos seis arquivos consumidores.
  Cobrem fidelidade, origem histórica, marcos/estado ENT, regularização,
  recuperação de emissão, bytes adulterados e recusas de leitura. Outros
  motores continuam na CI própria; não se alega reteste físico.
- pypdf conferiu sete PDFs sem assinatura e seis assinados, incluindo campos
  e células extensos em múltiplas páginas. pyHanko confirmou assinatura do
  arquivo inteiro e token temporal interno nos seis. Seis exemplares V9 e
  V10 conservaram texto e pixels em todas as páginas comparadas por PyMuPDF.
- A mesma inspeção independente conferiu11 emissões reais do aplicativo,
  abrangendo os quatro tipos e uma REQ histórica com código opaco. Quatro
  [exemplares controlados](d4-structure-proof/EXEMPLARS.json) e apenas sua raiz
  pública estão preservados; não há chave ou senha de assinatura no pacote.

O [resultado independente](d4-structure-proof/VERIFICATION.json) separa
corpus controlado, emissões do aplicativo e gates não aprovados. O
[manifesto](PDF_STRUCTURE_EVIDENCE.json) vincula fontes, logs e hashes.

## Contraprovas e limites

Remover árvore/MarkInfo, trocar pai ou chave de página, retirar escopo, quebrar
MCID/ParentTree, apagar conteúdo ou acrescentar texto sem tag é recusado. Uma
contraprova descobriu que a primeira gramática não percebia Tj seguido de ET na
mesma linha; foi corrigida e repetida. pypdf também recusa TH sem escopo.

O primeiro agrupamento do oráculo por prefixo de código falhou na REQ histórica
HC. O agrupamento passou a usar a especificação da fixture, e confere identidade,
documento, versão e hash; códigos preservados continuam opacos. Isso foi uma
correção do instrumento, sem reescrita da ficha ou do PDF. Logs conservados.

C-AC-111 continua parcial pelo ensaio humano/AT e pelas condições de D-C/D6.
Estrutura e extração não substituem essa tarefa. Os demais estados C105/C106,
impressão física e a futura aparência conservam seus critérios específicos.

## Remoto e publicação

Local/remoto162, zero pendências. Projeto qwfrqychokvhdzakibid conferido;
dry-run mostrou somente a migration162. Histórico SQL, quatro definições,
V9 anterior, grants e saúde pertinentes coincidiram após aplicação. Sem reset,
seed/Auth remoto, ativação externa ou backup/restore redundante. O
[recibo](PDF_STRUCTURE_REMOTE_MIGRATIONS.json) distingue essa reconciliação de
um ensaio operacional de recuperação. Certificado/TSA, backup e monitores
mantêm seus dossiês e limites. PR7 Draft, sem merge/promoção; Sonar adiado pelo
responsável. CI do novo SHA obrigatória. Meta D-B ativa.
