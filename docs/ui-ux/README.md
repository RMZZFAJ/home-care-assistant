# Guias da fundação de interface

**Regra visual vigente:**[Modelo Integral](CANONICAL_MODEL.md). Fluent UI foi
descartado como aparência; o conteúdo AS_IS abaixo é histórico quando divergir
da nova direção. Preservar funções e contratos durante a migração integral.

Guias AS_IS/normativos da base funcional auditada; desvios A/B permanecem
registrados. O [estado por SHA](../current/PROJECT_STATUS.md) é a fonte atual.
O [projeto C3](../audits/C/C3-functional-specification/README.md) descreve como
deverá funcionar; não foi implementado nesta reorganização.

- [Fundação visual](DESIGN_SYSTEM.md), [componentes](COMPONENTS.md),
  [arquitetura de informação](INFORMATION_ARCHITECTURE.md) e [mapa](SCREEN_MAP.md).
- [Escalas existentes](SCHEDULES.md) e [BAL existente](BALANCES.md), com
  exceções delimitadas nas auditorias e evolução planejada em C.
- [Inventário gerado datado](INVENTORY.md) e inventory.json permanecem no
  endereço consumido por ferramenta; não são censo reexecutado em C.
- [Execução histórica](../archive/ui-ux/EXECUTION.md),
  [matriz histórica](../archive/ui-ux/ACCEPTANCE.md) e protótipos/capturas
  arquivados não constituem aceite atual de aparelho ou participante.

Paciente, capacidades e fatos separados são preservados. Aparência segue o
Modelo Integral; Fluent não é diretriz visual vigente. Não executar
inventory-ui ou probes históricos para atualizar resultados sem destino/base
e guardas D0: B8-M002 registrou risco de sobrescrita. Nenhum guia concede
autorização de banco, envio, deploy ou merge.
