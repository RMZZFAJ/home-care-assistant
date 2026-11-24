"use client";

import { useState } from "react";
import { z } from "zod";
import { ActionButton, CheckboxField } from "@/components/ui/controls";
import { Drawer } from "@/components/ui/overlays";
import { Icon } from "@/components/ui/icon";
import { PreferenceSettings, type PreferenceEditorProps } from "./preference-settings";
import "./preference-settings.css";

const channels = { internal: "No sistema", email: "E-mail", whatsapp: "WhatsApp" } as const;
const valueSchema = z.object({ internal: z.boolean(), email: z.boolean(), whatsapp: z.boolean() });
const result = z.object({ data: valueSchema.extend({ version: z.number().int().nonnegative(), attemptId: z.uuid().nullable(), savedVersion: z.number().int().nonnegative().nullable() }) });
const decode = (raw: unknown) => result.parse(raw).data;
type Channels = z.infer<typeof valueSchema>;

export function ChannelPreferences({ active, email, phone }: { active: boolean; email?: string; phone?: string | null }) {
  return <PreferenceSettings active={active} url="/api/profile/notices" title="Canais de comunicação"
    summary={value => (Object.keys(channels) as (keyof Channels)[]).filter(key => value[key]).map(key => channels[key]).join(" · ") || "Nenhum canal opcional selecionado"}
    editLabel="Editar canais de comunicação" successTitle="Preferências salvas"
    successText="Os canais escolhidos serão usados quando estiverem disponíveis para as próximas atualizações."
    decode={decode} Editor={ChannelEditor} details={{ email, phone }} />;
}

function ChannelEditor({ value, discard, save, details: { email, phone } }: PreferenceEditorProps<Channels, { email?: string; phone?: string | null }>) {
  const [selected, setSelected] = useState(() => valueSchema.parse(value));
  const help = { internal: "Consultar avisos pela central do Home Care Assistant.", email: email ?? "Sem e-mail cadastrado.", whatsapp: phone ?? "Sem telefone confirmado." };
  return <Drawer open title="Canais de comunicação" kicker="Preferências pessoais" headingIcon="send" popupClassName="hca-preference-sheet" onClose={discard}
    footer={<><ActionButton onClick={discard}>Voltar</ActionButton><ActionButton variant="primary" onClick={() => save(selected)}><Icon name="check" />Salvar preferências</ActionButton></>}>
    <div className="hca-preference-body">
      {(Object.keys(channels) as (keyof Channels)[]).map(key => <CheckboxField key={key} className="hca-preference-channel"
        role="switch" aria-label={channels[key]} checked={selected[key]} onChange={event => {
          const checked = event.currentTarget.checked;
          setSelected(value => ({ ...value, [key]: checked }));
        }} label={<><strong>{channels[key]}</strong><small>{help[key]}</small></>} />)}
      <p className="hca-preference-hint hca-channel-note"><Icon name="shield" width={17} height={17} />O envio externo depende de contato validado, canal disponível e configuração do paciente. Sua preferência mantém o mesmo alcance de acesso.</p>
    </div>
  </Drawer>;
}
