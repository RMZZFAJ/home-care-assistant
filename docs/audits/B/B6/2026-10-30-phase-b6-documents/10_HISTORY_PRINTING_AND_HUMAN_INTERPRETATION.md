# B6.10 — História, impressão e interpretação

## Leitura como responsável de residência

A análise semântica e visual foi feita pelo agente. Não substitui observação de
pessoas reais usando a ficha, testes de baixa visão, impressora, câmera ou
aceite operacional. A aparência é sóbria e consistente nas amostras comuns.
Cabeçalho, tipo, paciente, estado, linhas e rodapé orientam a leitura; histórico
e integridade estão separados na segunda parte. Não há motivo demonstrado para
exigir A5 ou redesenho decorativo.

- **Saber qual REQ está parcial**. **O que consegue:** Conta1/2 e nota sobre
  ciência. **Onde a reconstrução falha ou exige consulta:** Não sabe qual linha
  foi atendida apenas pela tabela PDF.
- **Saber quanto entrou numa COM**. **O que consegue:** Vê
  aprovado/adquirido/validado distintos. **Onde a reconstrução falha ou exige
  consulta:** Não distingue chegada pendente de validação só pelo agregado.
- **Conferir uma ENT com avaria**. **O que consegue:** Vê10 expedido, 6 aceito,
  divergência aberta. **Onde a reconstrução falha ou exige consulta:** Ressalva
  de avaria não aparece no PDF; precisa fonte/anexo.
- **Tratar ENT cancelada**. **O que consegue:** Subtítulo Cancelado e evento.
  **Onde a reconstrução falha ou exige consulta:** Card e instrução continuam
  pedindo recebimento.
- **Entender quem aprovou BAL**. **O que consegue:** Nomes na história e estado
  Aprovado. **Onde a reconstrução falha ou exige consulta:** Sem
  grupo/count_version; não relaciona aprovação ao reconto com precisão.
- **Reconstituir autoria de supply antigo**. **O que consegue:** PDF preserva
  nomes; UUID no evento. **Onde a reconstrução falha ou exige consulta:** Tela
  busca diretório atual; pessoa desligada pode virar genérica.
- **Recuperar PDF antigo**. **O que consegue:** Endpoint de versão existe e
  conserva cache. **Onde a reconstrução falha ou exige consulta:** UI lista
  versão sem link de download por evento.
- **Interpretar legado sem data**. **O que consegue:** Qualificador de registro
  histórico. **Onde a reconstrução falha ou exige consulta:** Data derivada pode
  parecer original; ciência não comprovada vira PENDENTE.
- **Conferir anexo externo**. **O que consegue:** Arquivo pronto e hash
  acessíveis. **Onde a reconstrução falha ou exige consulta:** Validado é
  formato/derivado; anotações visuais podem ter desaparecido.

São problemas específicos de significado, não prova de que toda pessoa será
enganada. Contadores, subtítulos corretos, ressalvas e consulta autorizada são
controles compensatórios. Teste humano futuro deve pedir reconstrução de fato e
próxima ação, sem orientar previamente a resposta desejada.

## Impressão e continuidade

Vinte páginas coloridas selecionadas de onze PDFs foram inspecionadas na B6.6.
Uma rasterização monocromática adicional de PV03-p1 foi vista: cabeçalhos,
tabelas, contraste e rótulos permanecem distinguíveis nessa amostra. É simulação
digital de cinza, não prova de qualidade em impressora econômica ou cópia
física. Ver evidence/images/PV03-p1-gray.png.

A4, margens44pt e numeração Página x de y são consistentes. Código/versão
continuam no rodapé de páginas de tabela sem título repetido. Isso preserva
identificação de continuação; não se confirmou página solta sem identidade. Dois
lados mínimos por documento podem ter custo de papel, mas separar a auditoria é
opção editorial, sem defeito técnico demonstrado.

PV09 constitui exceção confirmada: conteúdo fora do papel e sobre rodapé, com
marcador final invisível. A limitação está na fragmentação de célula, não em
ausência geral de cabeçalhos ou numa lista grande normal. Texto extraível/PDF
abrindo não teria detectado sozinho a perda visual.

Fontes pequenas6, 2–9pt e ausência de tags/idioma merecem homologação de
acessibilidade proporcional, aproveitando B1-A11Y-001. Não declarar leitor de
tela aprovado pela extração textual. Impressão real, QR por câmera, daltonismo/
baixa visão, dispositivos móveis físicos, compartilhamento nativo e compreensão
por familiares/profissionais permanecem NOT_VERIFIED nesta B6.
