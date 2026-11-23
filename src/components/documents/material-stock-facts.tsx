import { ActionButton, Pill } from "@/components/ui/controls";
import { Icon, type IconName } from "@/components/ui/icon";
import { formatQuantity, quantity } from "@/lib/quantity";
import { formatBrazilDate } from "@/lib/receipt";
import { stockBalanceSituation } from "@/lib/stock-presentation";
import type { ProductStock, StockCustody } from "@/types/stock";

type Stock = { family: string | null; team: string | null; positions?: {
  family: ProductStock["family"];
  team: ProductStock["team"];
  transfersAvailable: boolean;
} };

export function MaterialStockFacts({ data, unit, onTransfers, onPurchases }: {
  data: Stock;
  unit: string | null;
  onTransfers: (kind: "ENT" | "DEV") => void;
  onPurchases?: () => void;
}) {
  const { positions } = data;
  const custodies = [
    { key: "family", name: "Família", icon: "home", type: "DEV" },
    { key: "team", name: "Equipe", icon: "users", type: "ENT" },
  ] as const;
  const available = custodies.flatMap(custody => {
    const confirmed = data[custody.key];
    return confirmed === null ? [] : [{ ...custody, confirmed }];
  });
  const amount = (value: string) => formatQuantity(value, unit ?? undefined);
  return <>
    <section aria-label="Estoque atual">
      <h3>Estoque atual</h3>
      {available.length ? <div className="hca-stock-custodies" data-count={available.length}>
        {available.map(({ key, name, icon, confirmed }) => <MaterialCustody key={key} name={name} icon={icon}
          stock={positions?.[key]} confirmed={confirmed} unit={unit} />)}
      </div> : <p>Nenhum saldo está disponível para este material no vínculo atual.</p>}
    </section>
    {positions && (positions.family || positions.team) ? <section aria-label="A receber">
      <div className="hca-material-receivable">
      <h3>A receber</h3>
      <dl className="hca-material-commitments">
        {positions.transfersAvailable ? custodies.map(({ key, name, type }) => {
          const stock = positions[key];
          if (!stock) return null;
          return <div className="hca-material-commitment" key={key}>
            <dt><span className="hca-material-commitment-icon"><Icon name="truck" width={17} height={17} /></span><span>
              <strong>Entrada em trânsito</strong><small>Destino · {name}</small>
            </span></dt>
            <dd>{amount(stock.incoming)}</dd>
            {quantity(stock.incoming).gt(0) ? <dd className="hca-material-commitment-action">
              <ActionButton compact variant="quiet" onClick={() => onTransfers(type)}>Consultar fichas de {type === "ENT" ? "entrega" : "devolução"}</ActionButton>
            </dd> : null}
            <dt className="hca-material-commitment-note">Divergência pendente</dt>
            <dd className="hca-material-commitment-note">{amount(stock.disputed ?? "0")}</dd>
          </div>;
        }) : null}
        {positions.family ? <div className="hca-material-commitment">
          <dt><span className="hca-material-commitment-icon"><Icon name="box" width={17} height={17} /></span><span>
            <strong>Compra para a família</strong><small>Compra registrada, aguardando chegada</small>
          </span></dt>
          <dd>{amount(positions.family.purchaseAwaiting ?? "0")}</dd>
          <dt className="hca-material-commitment-note">Compra aprovada a realizar</dt>
          <dd className="hca-material-commitment-note">{amount(positions.family.purchaseExpected ?? "0")}</dd>
          <dt className="hca-material-commitment-note">Chegada aguardando validação</dt>
          <dd className="hca-material-commitment-note">{amount(positions.family.purchasePendingValidation ?? "0")}</dd>
          {onPurchases && (quantity(positions.family.purchaseExpected ?? "0").gt(0)
            || quantity(positions.family.purchaseAwaiting ?? "0").gt(0)
            || quantity(positions.family.purchasePendingValidation ?? "0").gt(0)) ? <dd className="hca-material-commitment-action">
            <ActionButton compact variant="quiet" onClick={onPurchases}>Consultar compras vinculadas</ActionButton>
          </dd> : null}
        </div> : null}
      </dl>
      </div>
      {positions.transfersAvailable || positions.family ? <p className="hca-material-observation-note">
        As quantidades a receber permanecem separadas do saldo disponível.
      </p> : <p>Os compromissos deste material estão indisponíveis para este vínculo.</p>}
    </section> : null}
  </>;
}

function MaterialCustody({ name, icon, stock, confirmed, unit }: {
  name: string;
  icon: IconName;
  stock: StockCustody | null | undefined;
  confirmed: string;
  unit: string | null;
}) {
  const situation = stock ? stockBalanceSituation(stock) : undefined;
  return <dl className="hca-stock-custody hca-material-custody" data-tone={situation?.tone} aria-label={name}>
    <dt className="hca-stock-custody-label"><Icon name={icon} width={14} height={14} />{name}<span className="sr-only"> · disponível</span></dt>
    <dd className="hca-stock-custody-quantity"><strong>{formatQuantity(confirmed)}</strong>{unit ? <>{" "}<span>{unit}</span></> : null}</dd>
    {stock ? <>
      <dt className="sr-only">Mínimo configurado</dt>
      <dd><small>{stock.minimum === null ? "Não definido" : "Mínimo " + formatQuantity(stock.minimum)}</small></dd>
      {situation && situation.tone !== "neutral" && situation.tone !== "success" ? <dd><Pill tone={situation.tone}>{situation.label}</Pill></dd> : null}
      <dt className="sr-only">Atualização do saldo</dt>
      <dd>{stock.updatedAt ? <time dateTime={stock.updatedAt}>{formatBrazilDate(stock.updatedAt)}</time> : <small>Sem movimentação registrada</small>}</dd>
    </> : null}
  </dl>;
}
