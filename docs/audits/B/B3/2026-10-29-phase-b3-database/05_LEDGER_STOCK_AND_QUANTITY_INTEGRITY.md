# Ledger, custódias e quantidades

## Modelo e conservação demonstrada

Para paciente/produto/custódia, saldo = soma de entradas − soma de saídas.
Transferir q gera débito na origem e crédito no destino no mesmo movimento;
o total FAMILY + CARE_TEAM + TRANSIT não muda. Entrada externa aumenta o
total; consumo/perda confirmados reduzem o total. Contagem BAL reconciliadora
não é automaticamente consumo. As contas foram verificadas com Decimal e
consulta SQL independente, sem editar saldo nem apagar movimentos.

Doze cenários novos estão em [b35](evidence/b35-results.json). Entrada 10 e
expedição 4 deixaram FAMILY6/TRANSIT4. Aceite parcial de 2 deixou
FAMILY6/TEAM2/TRANSIT2; repetir chave não criou evento/movimento. Devolver 1
conservou total; declarar perda de 1 retirou apenas 1 do trânsito. Relato de
consumo não debitou; confirmar 1 debitou somente equipe uma vez. Retorno por
ENT para familiar transferiu equipe → trânsito → família sem mudar total.

COM de doação 3, aquisição e chegada familiar informada de 2 não alteraram
estoque antes da validação. Validar recibo creditou 2 em FAMILY e preservou
partially_received. COM não atendeu REQ nem foi tratada como ENT.

## Locks, referências e proteção

O trigger adquire lock transacional stock por paciente, deriva revisão do
movimento, verifica precisão e calcula antes/depois. Recusa custódias nulas
simultâneas, origem igual ao destino e saída sem saldo. Escopo produto/paciente
tem FK composta. Ordenação de linhas por produto e lock por paciente evitam
saldo calculado simultaneamente sem serialização. DML de cliente e serviço
está revogado; os endpoints antigos de ajuste/inventário não são atalhos livres.

Zero, negativo, NaN, Infinity e acima de um bilhão foram recusados pela RPC
familiar; saída maior que saldo e fração incompatível também, sem novo
movimento.
A hipótese de NaN entrar livremente no ledger foi refutada: a comparação com
teto superior o recusa. Não confundir essa contraprova com o fator de catálogo
descrito abaixo. Unidade com história continuou imutável.

B2-005 foi revalidado: correction_in sem referência gravou family_manual com
reference_id nulo. Referência de outro produto foi recusada. A regra protege
a referência quando fornecida, mas não a exige. Não recomenda restringir
entradas avulsas legítimas; correção compensatória precisa de contrato próprio.

## Novidade: arredondamento antes da validação de precisão

B35-09 enviou 1.0000004 pela RPC familiar para produto de precisão zero.
Persistiu 1.000000. family_stock_movement não compara a quantidade original
com a precisão; private.move_stock insere em numeric(18,6), que arredonda antes
do BEFORE trigger. O trigger vê 1, compatível com zero casas, e aceita.
Portanto a garantia de recusar quantidade incompatível é incompleta para
frações que desaparecem na coerção da coluna.

A API exactQuantity bloqueia mais de seis casas, um mitigador real. A chamada
RPC direta com autoridade legítima permanece uma fronteira suportada. Não foi
demonstrado saldo NaN nem grande perda financeira: a consequência comprovada
é divergência entre quantidade comandada e quantidade registrada. Futuro
aceite deve validar o parâmetro antes da coerção, preservar inputs válidos,
hash/idempotência e jamais reescrever ledger histórico silenciosamente.

## Novidade: apresentação com fator NaN

B35-10 gravou base_quantity=NaN por configure_catalogue_unit, sem criar
movimento. O CHECK base_quantity>0 e a condição de arredondamento não bastam:
numeric NaN é igual a NaN e maior que os valores comuns no PostgreSQL.
O catálogo conserva um fator sem significado quantitativo. O schema HTTP
exactQuantity impede essa entrada pela API, mas a RPC não.

Isso afeta a confiabilidade da conversão por embalagem; não comprova débito
ou crédito inválido nem deve ser generalizado para todos os decimais. Decidir
limites plausíveis e rejeitar não finitos no contrato autoritativo; inventariar
dados legados antes de qualquer migração futura. Preservar unidade base,
apresentações válidas e snapshots anteriores.

As semânticas de coerção e NaN foram conferidas na
[documentação PostgreSQL
17](https://www.postgresql.org/docs/17/datatype-numeric.html),
além da reprodução local; não são suposições de JavaScript.

## Limites e próximas provas

Cancelamento com consumo e estados documentais seguem B3.6; BAL segue B3.7;
concorrência forçada e autoridade após espera seguem B3.8. B2-006/007/008
continuam dependências de proveniência, material inativo e navegação histórica.
Não há prova de exclusão de dados, migração remota ou estado de estoque real.
Não se usou consumo fictício como contorno de cancelamento.
