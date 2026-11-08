"use client";
import Link from "next/link";
import type { z } from "zod";
import { deliveryImpact } from "@/lib/operations/contracts";
import { useScopedRead } from "@/lib/use-scoped-read";
import { useLiveRevision } from "@/lib/use-live-revision";
import { buttonClass } from "@/components/workspace";

export function DeliveryImpact({ patientId }: { patientId: string }) {
  const revision = useLiveRevision();
  const read = useScopedRead<{ data: z.infer<typeof deliveryImpact> }>("/api/operations/impact?careRecipientId=" + patientId, String(revision));
  const parsed = read.data ? deliveryImpact.safeParse(read.data.data) : null, data = parsed?.success ? parsed.data : null;
  const failure = read.error || (parsed && !parsed.success ? "Não foi possível confirmar as pendências. Consulte novamente." : "");
  return <section className="ui-card space-y-3" aria-label="Atrasos e recuperação do acompanhamento"><h2 className="font-semibold">Atrasos e recuperação</h2>
    {read.loading ? <p>Consultando pendências próprias…</p> : failure ? <p role="alert">{failure} <button type="button" className={buttonClass} onClick={read.refresh}>Consultar pendências novamente</button></p> : data ? <>
      <p>{data.delayedNotices} aviso(s) aguardando processamento · {data.unconfirmedNotices} resultado(s) de aviso sem confirmação · {data.recoverableOwnPdfs} PDF(s) próprios aguardando recuperação.</p>
      {data.delayedNotices + data.unconfirmedNotices > 0 ? <p>Confira a tarefa de origem antes de repetir qualquer ação. Um aviso atrasado ou incerto não confirma entrega nem ciência. Se precisar, peça ajuda ao administrador do paciente.</p> : null}
      {data.recoverableOwnPdfs > 0 ? <p>Abra a ficha em Histórico, consulte os arquivos e recupere a mesma emissão antes de solicitar outra.</p> : null}
      {!data.delayedNotices && !data.unconfirmedNotices && !data.recoverableOwnPdfs ? <p>Nenhuma pendência própria identificada nesta consulta.</p> : null}
      <div className="hca-toolbar"><Link className={buttonClass} href={"/historico?careRecipientId=" + patientId}>Consultar minhas fichas</Link><Link className={buttonClass} href="/guias">Guias e ajuda</Link></div>
    </> : null}
  </section>;
}
