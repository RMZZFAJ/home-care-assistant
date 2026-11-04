# Notas de achados e contraditório

Registro de trabalho; o mestre final prevalecerá na consolidação.

- Novo B34-05: decisão p_accept null vira rejected com sucesso. Capacidade
  continua obrigatória; HTTP booleano mitiga, não protege RPC direta.
- Novo B35-09: parâmetro 1.0000004 persiste 1.000000 por coerção numeric(18,6)
  antes do trigger de precisão. API regex mitiga. Não reescrever histórico.
- Novo B35-10: fator de apresentação NaN persiste, sem movimento de estoque.
  Comparação positiva e round não o rejeitam. Teto de ledger o rejeita.
- Revalidação B34-04/B2-011: decisão oposta retorna sucesso sem mudar fato.
- Revalidação B35-11/B2-005: correção sem referência aceita; referência alheia
  recusada. Não propor eliminar entrada avulsa legítima.
- Refutada: NaN livre no ledger via family_stock_movement. B35-07 recusou NaN,
  Infinity e teto. Fator NaN de catálogo não equivale a ledger NaN.
- Pendente dirigida: autoridade alterada durante espera por lock. B33 prova
  somente chamadas iniciadas após revogação. Não generalizar ainda.

Preservação: snapshot privado de 3.693 linhas anteriores em 20 tabelas,
capturado
antes da criação B3; nenhum payload ou hash individual privado no pacote.
Verificação final deve comparar originais e classificar mudanças automáticas
eventuais, em vez de presumir perda a partir de contagens globais.
