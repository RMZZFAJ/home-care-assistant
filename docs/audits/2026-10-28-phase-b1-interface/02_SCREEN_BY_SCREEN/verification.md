# SC-005 — Verificação pública

Rota: `/verificar/[id]`. Situação: ACTIVE.
Fonte principal: [src/app/verificar/[id]/page.tsx](../../../../src/app/verificar/[id]/page.tsx).

## Intenção e contexto

Conferir hash e versão sem divulgar conteúdo privado.

Perfis/capacidades: público. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 62 | a | Acessar documento com autorização  | "/login" |

Fontes de interface relacionadas: `src/app/verificar/[id]/page.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Explica limite do SHA-256 e não exibe dados assistenciais.

## Atritos e contraditório

Parâmetros ausentes e ausência de correspondência recebem a mesma frase; acesso autorizado vai ao login genérico.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Distinguir link incompleto de não correspondência; ação para reler QR ou abrir documento autorizado com retorno seguro.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [public, 390px, verify-invalid](../evidence/b11-public-verify-invalid-390.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.

QR físico e indisponibilidade real da RPC não homologados.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
