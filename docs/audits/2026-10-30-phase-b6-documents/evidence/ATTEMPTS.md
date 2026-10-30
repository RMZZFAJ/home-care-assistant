# Tentativas instrumentais

- Leitura inicial da ordem excedeu o orçamento de saída; os trechos foram lidos
  em intervalos para completar o texto. Sem conclusão baseada no trecho
  truncado. Algumas consultas de nomes usaram glob de caminho não expandido por
  rg no Windows; corrigidas com inventário e caminho exato.
- Uma impressão Python de achados anteriores usou console cp1252 e falhou ao
  imprimir seta. Arquivo original permaneceu íntegro. Leituras/escritas
  seguintes usam UTF-8; não é defeito do produto.
- B62 primeira tentativa: fixture usou protocolo B6-LEGACY fora do contrato.
  Constraint recusou corretamente; conexão encerrou a transação sem commit.
  Corrigido somente o protocolo fictício para formato HC vigente. Dois novos
  usuários Auth fictícios já criados foram reutilizados, sem reprovisionamento.
  Não se flexibilizou constraint nem se alterou registro anterior. É falha do
  instrumento, não achado documental. O ensaio usa helper de registro legado;
  não afirma executar o importador completo dos protocolos físicos 1–11.
- Consulta web aos endpoints Markdown oficiais encontrou content-type não
  suportado; documentação Supabase pesquisada pelo conector oficial. Sem mudança
  de configuração ou dependência para contornar o acesso.
- B66 revisão de fixtures antes da conclusão visual: exemplos terminais de
  COM/BAL e a ENT cancelada foram ajustados para não sugerir cancelamento de
  aquisição já recebida ou parcelas incompatíveis. Somente PV04/05/10/11 foram
  regenerados; demais sete PDFs não foram repetidos. São snapshots de ensaio,
  não históricos de produto. PV07 é perturbação de layout, sem alegação de
  sequência de comandos válida ou de aceite físico.
- B66-S02 primeira tentativa: instrumento atribuiu retorno composto de
  admin_upsert_recipient_product diretamente a jsonb. Conversão recusada,
  transação revertida. Conferida assinatura vigente e usado to_jsonb do retorno
  composto. Nenhum diagnóstico do produto decorre dessa tentativa.
- Um patch documental procurou contexto inexistente de checkpoint e foi recusado
  antes de escrever. Reaplicado com seção existente; sem artefato parcial usado
  como evidência.
- B69 primeira decodificação chamou decode sem hints na biblioteca instalada,
  que deixou readers indefinido. Implementação e tipos locais inspecionados;
  decodeWithState inicializa leitores conforme contrato e foi adotado. Nenhum QR
  foi regenerado e nenhum domínio foi consultado; não é falha do PDF.
- B612 primeira montagem usou variável id em consulta de purchase_receipts,
  ambígua com a coluna. Erro do instrumento desfez a transação; variável foi
  renomeada para v_document_id e o SQL conferido antes da execução seguinte. Não
  confundir com B3-002: o erro42702 conhecido do produto não foi chamado nem
  corrigido neste teste COM. Rejeição/validação posterior usou RPC vigente.
- Consolidação documental: primeiro path de resultado omitia evidence/; depois
  faltava import de Path no trecho de proveniência. Após as duas falhas de
  montagem, foram conferidos nomes/imports e destinos antes de retomar. Somente
  montagem de textos/CSV foi repetida; nenhum SQL, Auth, PDF ou teste de produto
  foi reexecutado. Checkpoint de encerramento só é anexado no fim.
- Primeiro lint documental encontrou linhas/tabelas extensas e espaçamento
  compacto. Formatação será ajustada sem desabilitar regras ou repetir provas
  funcionais; os resultados brutos e os PDFs permanecem inalterados.
- ESLint encontrou uma variável descartada de caminho privado no helper de
  backup. Corrigida só a projeção do metadado; novo backup não foi executado.
- Primeira guarda de escopo do validador usava strip no status Git e perdeu
  espaço de prefixo porcelain. Leitura bruta preservou prefixo; nenhum arquivo
  fora do escopo foi encontrado. Validador passou sem repetir SQL/Auth/PDF.

- Revisão editorial final acrescentou espaço após dois-pontos dentro de rótulos
  em negrito. A regra foi restringida e os rótulos reparados; Markdown voltou a
  zero erros. Nenhuma regra foi desativada ou PDF/regra funcional alterado para
  corrigir a apresentação dos relatórios.
- Pedido do responsável para desfazer temporário publicado: reversão somente de
  índice para a árvore B5, commit inverso c9e15ec e conferência de 154 hashes de
  arquivos mantidos no disco. A estratégia evita force push e preserva o pacote
  para o novo commit final; não é restauração de banco ou de documentos
  operacionais históricos.

- git diff --check detectou um espaço final na extração nativa PV07-p3. Cópia
  textual normalizada; extração bruta preservada em gzip com SHA256 e prova em
  text-normalization.json. PDF/imagem/corpo não foram regenerados. Avisos
  LF/CRLF do Git não alteram os blobs LF conferidos no índice; nenhuma
  configuração foi mudada. O manifesto deve corresponder aos bytes commitados.
