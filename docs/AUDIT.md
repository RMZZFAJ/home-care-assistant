# Auditoria e rastreabilidade

A auditoria principal está organizada em
[20/10/2026](audits/2026-10-20/README.md), com checkpoint persistente,
evidências de execução, matriz dos três prompts, comparação de banco,
achados, correções e limites.

A [continuação de 21/10/2026](audits/2026-10-21/README.md) registra a mudança
para o banco local de desenvolvimento como destino dos testes, a correção
da identidade Supabase CLI e as novas autorizações de atualização e publicação.
As restrições antigas são históricas; prevalecem as decisões posteriores.

Os diagnósticos históricos dos prompts não são tratados como fatos atuais.
A migration 012, antes apontada como ausente, existe e foi testada no caminho
limpo e incremental. A coluna removida não está no schema final.

Uma funcionalidade só pode ser classificada como validada quando os critérios
pertinentes têm evidência executada. Existência de SQL, endpoint, componente
ou teste unitário não comprova o fluxo completo. Diferenciar implementação,
inspeção, integração real, configuração externa e bloqueios.

O histórico anterior permanece no Git. Informações obsoletas e referências
pessoais foram retiradas dos documentos operacionais atuais.
