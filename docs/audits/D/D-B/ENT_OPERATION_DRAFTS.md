# Preenchimentos privados das decisões ENT

Incremento D3.35, base56b445e. Troca de destinatário, conciliação, cancelamento,
recusa e retirada do pedido agora retomam preenchimento privado entre sessões.
Recebimento/divergência pessoais existentes permanecem no mesmo kernel.
[Provas](ENT_OPERATION_DRAFTS_VALIDATION.json),
[reconciliação remota](ENT_OPERATION_DRAFTS_REMOTE.json).

## Comportamento implementado

Cada propósito tem slot próprio por usuário, paciente e entrega, etapa validada,
CAS e consumo único. Salvar, comparar e fechar a revisão não alteram estoque,
eventos oficiais ou documento. Destinatário, linha, solução, quantidade incompleta,
motivo e pedido retomam os valores preservados. Outro administrador não lê nem
descarta o preenchimento pessoal. Labels privados são referências de exibição;
identidade, papel, autoridade e versão continuam sendo conferidos no banco.

Pessoa ou solução antes escolhida que ficou indisponível permanece identificada,
sem substituição silenciosa. O usuário precisa fazer outra escolha disponível.
Recebimento pessoal não pode ser confirmado por outro gestor. A conciliação
identifica material e unidade na revisão. Referência obsoleta usa o leitor Auth
das duas versões exatas; recusa ou erro impedem adotar fatos não conferidos.

Recusa e retirada preservam a identidade e descrição do pedido original. Novo
pedido exige comparação e adoção explícitas, mantendo o motivo próprio. O commit
vincula destinatário, linha/solução ou pedido à revisão privada salva e confere
novamente a autorização após os efeitos internos. Perder a autoridade nessa
etapa provoca rollback integral. Recuperação do mesmo resultado usa leitura
autorizada e não repete o ato. Cancelar após aceite abre o pedido bilateral;
não pressupõe devolução física ou compensação de consumo.

Corrigido um impedimento real do descarte: o proprietário que perdeu a condição
para receber a ENT pode descartar seu preenchimento, desde que ainda tenha
leitura do paciente/documento. Salvar continua exigindo autoridade de escrita.
Outro administrador e usuário com leitura revogada continuam impedidos.

## Validação e contraprovas

28 unitários/API e42 cenários distintos com Auth real aprovados. Incluem CAS,
segunda sessão, privacidade, seleção/pedido trocado, negativa de recebimento
pessoal, revogação sob lock observado, replay, reconhecimento e descarte.
Um trigger local dirigido retira o papel real de administrador durante o ato
interno: a segunda guarda nega e reverte documento, estoque, journal, revisão
privada e mudança de papel. É prova estrutural local; não simula provedor externo.
O trigger e a função auxiliar são retirados no finally.

20 cenários distintos Chromium/WebKit aprovados, com reuso discriminado no JSON.
As seis falhas iniciais eram dos oráculos: fixture usava status inexistente e
dois formulários tinham rótulos próprios. Corrigidos os testes, repetidos somente
os seis afetados; os14 aprovados com produto inalterado foram conservados.
Nenhum caso, regra, asserção de estoque ou limite de tempo foi retirado.
Axe, duas capturas de viewport inspecionadas, tipos e lint dirigidos aprovados.

Outros10 casos WebKit de consumidores existentes passaram após navegação pelas
abas corretas, seletor de título e auditoria responsiva desde o início da página.
A falha intermediária de aba incorreta fica preservada.

[Observação CI](CI_56B445E_OBSERVATION.json). CI56b445e aprovou
Windows/Ubuntu/banco e teve Preview READY. Os browsers revelaram
regressões adicionais de consumidores das abas, seletores, foco e auditoria em
posição rolada. Correções dirigidas de parte desses consumidores acompanham o
lote; a observação conserva as demais pendências. Não há aprovação global da CI,
paridade visual, aparelho físico, tarefa humana ou tecnologia assistiva.

## Remoto e próximos gates

Migration169:20261109135205. Compatibilidade, quatro corpos anteriores e dry-run
único conferidos; seeds=[]/roles=[]. Aplicação oficial no projeto vinculado,
sem reset, fixtures, Auth/Vault ou backup redundante. Local169/remoto169, digest,
quatro corpos/configurações e ACL iguais. Leitura direta privada e entrada anon/
service continuam fechadas. Achados de segurança iguais excluindo observed_at;
avisos anteriores preservados. Não é aprovação global de segurança.

Consentimento bilateral com referências de consumo, regularização administrativa,
transferência, decisões BAL/REQ e outros formulários contextuais continuam no
gate D-B-AC-001 parcial. Restam regressões da CI completa, paridade integral,
66/171 e gates D-C/D6/humanos/AT/aparelhos/provedores. Matriz105x39 preservada,
56 PASS/49 PARTIAL. Sonar adiado; PR7 Draft, sem merge ou produção. Assinatura,
backup, monitoramento e transportes não recebem nova aprovação neste lote.
