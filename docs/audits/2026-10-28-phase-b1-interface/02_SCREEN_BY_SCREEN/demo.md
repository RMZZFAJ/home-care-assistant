# SC-043 — Demonstrações públicas

Rota: `/documentos/[demo-id]`. Situação: PUBLIC_DEMO.
Fonte principal: [src/components/documents/demo-document.tsx](../../../../src/components/documents/demo-document.tsx).

## Intenção e contexto

Rever apresentação fictícia e PDF sem dados reais.

Perfis/capacidades: público. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 25 | a | Consultar PDF fictício  | {"/api/demonstracao/" + id + "/pdf"} |
| 31 | a | Acessar o sistema  | "/login" |

Fontes de interface relacionadas: `src/components/documents/demo-document.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Aviso sem valor operacional e IDs fixos; não consulta pacientes.

## Atritos e contraditório

Visualização HTML demonstra só materiais, sem reproduzir estados do visualizador privado.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Tratar como demonstração, nunca captura de aceitação de produção; documentar limites.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [public, 390px, demo-1](../evidence/b11-followup-public-demo-1.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.
- [public, 390px, demo-2](../evidence/b11-followup-public-demo-2.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.
- [public, 390px, demo-3](../evidence/b11-followup-public-demo-3.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.
- [public, 390px, demo-4](../evidence/b11-followup-public-demo-4.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.
- [public, 390px, demo-5](../evidence/b11-followup-public-demo-5.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.
- [public, 390px, demo-6](../evidence/b11-followup-public-demo-6.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.

PDF precisa revisão própria e impressão/QR físico não homologados.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
