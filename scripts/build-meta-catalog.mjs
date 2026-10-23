import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const original = JSON.parse(
  readFileSync(
    "docs/references/v3/home_care_meta_payloads_v3_PREENCHER.json",
    "utf8",
  ),
);
const domain = "https://home-care-assistant.vercel.app";
const req = "00000000-0000-4000-8000-00000000d001",
  ent = "00000000-0000-4000-8000-00000000d003";
const requests = original.create_requests.map((entry) =>
  JSON.parse(
    JSON.stringify(entry).replaceAll("https://DOMINIO_CONFIRMADO", domain),
  ),
);
for (const entry of requests) {
  const sampleId = entry.name.includes("_req_")
    ? req
    : entry.name.includes("_com_")
      ? "00000000-0000-4000-8000-00000000d005"
      : entry.name.includes("_bal_")
        ? "00000000-0000-4000-8000-00000000d006"
        : ent;
  for (const component of entry.components)
    for (const button of component.buttons ?? [])
      if (button.type === "URL")
        button.example = [button.url.replace("{{1}}", sampleId)];
}
const named = (values) =>
  values.map(([param_name, example]) => ({ param_name, example }));
function revised(name, title, body, parameters, pdf) {
  return {
    name,
    category: "UTILITY",
    language: "pt_BR",
    parameter_format: "NAMED",
    components: [
      pdf
        ? {
            type: "HEADER",
            format: "DOCUMENT",
            example: {
              header_handle: ["SUBSTITUIR_POR_HANDLE_DE_UPLOAD_META"],
            },
          }
        : { type: "HEADER", format: "TEXT", text: title },
      {
        type: "BODY",
        text: body,
        example: { body_text_named_params: named(parameters) },
      },
      { type: "FOOTER", text: "Home Care Assistant • Mensagem automática" },
      {
        type: "BUTTONS",
        buttons: [
          {
            type: "URL",
            text: "Consultar requisição",
            url: domain + "/historico/{{1}}",
            example: [domain + "/historico/" + req],
          },
        ],
      },
    ],
  };
}
requests.push(
  revised(
    "hca_req_registrada_autor_v4",
    "REQUISIÇÃO REGISTRADA",
    "Olá, {{nome_destinatario}}! Sua requisição {{numero_requisicao}} para {{nome_paciente}}, registrada em {{data_hora}}, foi encaminhada para ciência familiar. São {{quantidade_itens}} itens, dos quais {{itens_urgentes}} urgentes. Você receberá uma nova mensagem com o PDF atualizado quando a ciência exigida estiver registrada. Acompanhe pelo sistema; o PDF de emissão já está disponível, identificado com ciência pendente.",
    [
      ["nome_destinatario", "Juliana"],
      ["numero_requisicao", "REQ-0007"],
      ["nome_paciente", "Paciente Exemplo"],
      ["data_hora", "22/10/2026 às 07h42"],
      ["quantidade_itens", "6"],
      ["itens_urgentes", "2"],
    ],
    false,
  ),
);
requests.push(
  revised(
    "hca_req_ciencia_familia_v4",
    "REQUISIÇÃO PARA CIÊNCIA",
    "Olá, {{nome_destinatario}}! {{nome_solicitante}} registrou a requisição {{numero_requisicao}} para {{nome_paciente}} em {{data_hora}}, com {{quantidade_itens}} itens. Consulte o PDF e registre sua ciência no aplicativo. A confirmação de ciência é independente do recebimento dos materiais; somente uma ENT recebida atende os itens.",
    [
      ["nome_destinatario", "Adriana"],
      ["nome_solicitante", "Juliana"],
      ["numero_requisicao", "REQ-0007"],
      ["nome_paciente", "Paciente Exemplo"],
      ["data_hora", "22/10/2026 às 07h42"],
      ["quantidade_itens", "6"],
    ],
    true,
  ),
);
requests.push(
  revised(
    "hca_req_ciencia_registrada_autor_v4",
    "CIÊNCIA FAMILIAR REGISTRADA",
    "Olá, {{nome_destinatario}}! A ciência familiar exigida da requisição {{numero_requisicao}} para {{nome_paciente}} foi registrada. Responsável: {{nome_responsavel}}. Origem da evidência: {{origem_ciencia}}. Data: {{data_hora_conclusao}}. O PDF atualizado, versão {{versao_documento}}, está anexado. O atendimento dos materiais continua dependendo dos recebimentos válidos das entregas vinculadas.",
    [
      ["nome_destinatario", "Juliana"],
      ["numero_requisicao", "REQ-0007"],
      ["nome_paciente", "Paciente Exemplo"],
      ["nome_responsavel", "Adriana"],
      ["origem_ciencia", "Confirmação expressa no aplicativo"],
      ["data_hora_conclusao", "22/10/2026 às 08h00"],
      ["versao_documento", "2"],
    ],
    true,
  ),
);
const priority = [
  "hca_req_registrada_autor_v4",
  "hca_req_ciencia_familia_v4",
  "hca_req_ciencia_registrada_autor_v4",
  "hca_ent_conferencia_autenticada_v3",
  "hca_ent_concluida_pdf_v3",
];
const simplified = globalThis.structuredClone(
  requests.find((request) => request.name === "hca_req_ciencia_familia_v4"),
);
simplified.name = "hca_req_ciencia_simplificada_v4";
simplified.components.find((component) => component.type === "BODY").text =
  simplified.components
    .find((component) => component.type === "BODY")
    .text.replace(
      "registre sua ciência no aplicativo",
      "confirme sua ciência pelo botão autorizado ou pelo aplicativo",
    );
simplified.components
  .find((component) => component.type === "BUTTONS")
  .buttons.unshift({ type: "QUICK_REPLY", text: "Confirmar ciência" });
requests.push(simplified);
const catalogue = requests.map((request) => ({
  ...request,
  version: request.name.endsWith("_v4") ? 4 : 3,
  approval: "PREPARED",
  priority: priority.includes(request.name),
}));
mkdirSync("src/lib/notifications", { recursive: true });
writeFileSync(
  "src/lib/notifications/template-catalog.json",
  JSON.stringify(catalogue, null, 2) + "\n",
);
mkdirSync("docs/meta", { recursive: true });
writeFileSync(
  "docs/meta/templates-v4-submission.json",
  JSON.stringify(
    {
      domain,
      requests: requests.filter((request) => priority.includes(request.name)),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Prepared ${catalogue.length} immutable template definitions; ${priority.length} priority submissions. No approval is assumed.`,
);
