# Complemento D3.41 — recuperação, quadro e quebra de texto

A CI f233be9 falhou duas vezes no cenário REQ403 do WebKit. O consumidor
já retira os dados ao receber 401/403/404. O teste passava do retry 503 para
403 esperando cabeçalho e foco que podiam pertencer ao estado anterior,
sem confirmar o término da leitura de recuperação. A resposta 503 mantém
legitimamente o cabeçalho; esses sinais não comprovam recuperação concluída.

O teste dirigido agora espera cada resposta HTTP, segura deliberadamente a
recuperação, confere o botão indisponível e o cabeçalho preservado após 503,
e só prossegue depois da resposta bem-sucedida, da retirada do erro anterior
e do botão habilitado com foco. Para 403, cabeçalho e materiais continuam
obrigatoriamente ausentes, inclusive enquanto a recuperação está retida.
Fatos documentais são comparados antes/depois. Não houve alteração no
consumidor REQ, na política de recusa ou nos timeouts.

O caso de anexos que passou apenas no retry da CI integra a rodada dirigida
nos dois motores. Nenhuma causa adicional ou correção de abas será presumida
apenas por um resultado instável. A comparação de referência da declaração
passou a formatar saldo atual autorizado pelo formatador compartilhado;
a quantidade própria incompleta continua sendo texto bruto.

Foram substituídas 38 ocorrências de break-words por wrap-break-word em 16
arquivos de código. A comparação de bytes exige que essa seja a única
alteração nesses arquivos. O compilador Tailwind 4.3.3 gera overflow-wrap:
break-word para a classe atual. A nomenclatura também consta da
[documentação oficial](https://tailwindcss.com/docs/overflow-wrap).
Referências históricas da auditoria/arquivo permanecem como relato do passado;
nenhum consumidor ativo conserva a classe anterior.

A pedido do responsável, TEMP_D_B_ATUALIZACAO.md reúne todos os 105 critérios
por funcionalidade, sem evidências, links ou detalhes de implementação.56
concluídos internamente e 49 parciais, com estimativas arredondadas,
responsáveis,
subtarefas operacionais em 0%, bloco visual e sequência pretendida. O avanço
visual de aproximadamente 60% é estimativa editorial de trabalho, não contagem
de telas aprovadas, medição de esforço ou aprovação das 66/171 superfícies.
Implementação 100% em uma linha não dispensa CI final nem validação humana.

6 cenários dirigidos aprovados:três Chromium móvel e três WebKit, sem retry.
Axe, quatro larguras e duas capturas inspecionadas.21 fontes conferidos e
congelados durante a rodada;build de produção do runner oficial passou.
Tipos e lint pertinentes passaram. Emulação não é homologação física.

[Validação](PREVIEW_RECOVERY_AND_STATUS_VALIDATION.json). Nenhuma migration
nova neste complemento;local/remoto 174 reconciliados no lote precedente.
A matriz técnica permanece 105x 39/primeiras 30, 56 PASS/49 PARTIAL e 18
linhas
visuais. Sonar adiado;PR7 Draft;sem merge, produção ou conclusão da meta.
