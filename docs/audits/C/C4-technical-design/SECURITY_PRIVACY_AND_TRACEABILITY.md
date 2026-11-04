# Segurança, privacidade e proveniência da evolução

O desenho preserva os controles comprovados B3/B4 e trata os desvios sem
ampliar autoridade. Não é novo scan B nem parecer de conformidade jurídica.
P01/P02/P04/P08/P15 têm contratos condicionais próprios.

## Fronteiras verificáveis

- Identidade oficial Auth, sessão vigente e contexto selecionado; não confiar
  em user_metadata, flags, telefone informado, nome ou UUID como autorização.

- Ação local exige membership/capacidade real e paciente do alvo; global
  apenas administra plataforma/propostas. Segunda aprovação é de identidade
  distinta.

- Revalidar após espera de lock conforme garantia P15; nova ação revogada é
  sempre negada. Considerar perfil/avatar/Storage diretos, não só a API.

- Rever RLS, grants explícitos/defaults, views security_invoker e EXECUTE de
  SECURITY DEFINER juntos. Nenhum novo service_role com DML público
  irrestrito.

- Lock em ordem consistente para paciente/documento/estoque/intenção;
  callbacks de tentativa antiga não alteram lease nova; recusa não confirma
  fato parcial.

- Origem/CSRF, limite/schema e códigos seguros por rota; payload não entra em
  logs/traces. Publicação de segredos nunca é instrumento de diagnóstico.

RLS limita linhas, mas precisa dos privilégios de acesso correspondentes;
definir policy e grants no mesmo desenho. Documentação oficial de sessões
explica que JWT e sessão têm ciclos próprios: a garantia de encerramento do
produto requer validação pertinente, não só expiração eventual do token.
[Sessões Supabase](https://supabase.com/docs/guides/auth/sessions),
[RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Matriz de dados e retenção pendente

<!-- c-table:start -->

- **Classe:** Fatos, ledger, versões e autoria

  **Uso e minimização:** Integridade operacional e reconstrução; acesso por
  paciente/capacidade

  **Conservação/retirada a decidir em P08:** Base/finalidade/prazo por classe
  e bloqueio de exclusão quando necessário; sem cascade por revogação.

- **Classe:** Identificação profissional

  **Uso e minimização:** Dados necessários, informado distinto de verificado

  **Conservação/retirada a decidir em P08:** Campos/verificador P01; evitar
  coletar documento pessoal extra por conveniência.

- **Classe:** Acesso/ciência

  **Uso e minimização:** Ator/instante/origem/regra/versão, sem afirmar
  leitura

  **Conservação/retirada a decidir em P08:** Trilha proporcional e prazo
  próprio; preferência posterior é prospectiva.

- **Classe:** Draft

  **Uso e minimização:** Conteúdo parcial próprio por intenção

  **Conservação/retirada a decidir em P08:** Prazo/abandono P12, sem guardar
  cada tecla ou expor a outro membro.

- **Classe:** Anexo original/derivado/PDF

  **Uso e minimização:** Hash e cadeia, original restrito quando permitido

  **Conservação/retirada a decidir em P08:** Policy por classe; não remover
  ready/ressalva silenciosamente.

- **Classe:** Push subscription

  **Uso e minimização:** Endpoint/chaves privados, estado por aparelho

  **Conservação/retirada a decidir em P08:** Revogar/desassociar e eliminar
  conforme prazo; não logar URL de capacidade.

- **Classe:** Telemetria

  **Uso e minimização:** Correlação/códigos/etapa/contadores úteis

  **Conservação/retirada a decidir em P08:** Sem corpo privado, token ou SQL;
  dono e acesso técnico definidos.

- **Classe:** Backup

  **Uso e minimização:** Recuperação conjunta, custódia/destino e criptografia

  **Conservação/retirada a decidir em P08:** Retenção, teste de restore e
  descarte do backup não equivalem ao dado online.

<!-- c-table:end -->

Conservação conservadora não significa indefinida automática. Critérios legais
dependem da classe/contexto e avaliação apropriada; C não inventa prazo de
lei. Pedido de direito do titular e obrigação de preservação exigem
procedimento com responsável, exceção registrada e minimização, sem editar
ledger histórico.

## Revogação e eventos verdadeiros

Arquivo já baixado não é recolhível por revoke. URL temporária mantém janela
aceita ou é substituída por proxy revalidado conforme P15; documentar custo e
limite. Ciência tácita não registra acesso. Contrassinatura não assina pelo
recebedor. Novo reconto não herda autor. Encerramento administrativo conserva
incerteza física. Data do fato, do registro e da emissão não se substituem.

## Preparação de ambiente e fornecedores

Dados fictícios da B não migram para operação. P04 decide destino; preview,
homologação e produção têm configuração/segredos/canais explicitamente
identificados. Restore deve negar egress e cron antes de carregar jobs/Vault;
não reutilizar URL/segredo antigo por acidente. PWA/push requer minimização em
lockscreen e deep link autenticado; Meta segue deferred com minimização ainda
pendente, sem afirmar que templates atuais omitem nome/material.

Changelog consultado em 30/10 e referências pertinentes atualizadas em
04/11/2026: há retirada anunciada de cifras TLS antigas a partir de 10/11 no
serviço gerenciado e correção de tzdata para três zonas. P10/D6 devem
verificar clientes reais e zonas usadas; isso não autoriza
upgrade/configuração em C nem demonstra impacto em America/Sao_Paulo.
[TLS](https://supabase.com/changelog/cbc-tls-ciphers-deprecated),
[tzdata](https://supabase.com/changelog/tzdata-local-time-vancouver-edmonton-casablanca).

## Precedência técnica C7–C10

As matrizes causais foram revisadas semanticamente, com domínios secundários
explícitos. P06/P11/P12/P14 e garantia de comando P15 já foram respondidos;
P02 por SCI-ID, retenção, fornecedores e parâmetros operacionais continuam
delimitados em C7. P09-B é obrigatório, com identidade própria por emissão;
não ativar núcleo só de hash como substituto. Toda evolução de schema usa
migration incremental e preserva os 84 hashes históricos.
[Adendo vigente](../C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md).
