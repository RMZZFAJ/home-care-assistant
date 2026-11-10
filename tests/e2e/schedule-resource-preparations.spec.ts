import { test, expect, type Page, type Browser } from "@playwright/test";
import {
  resourceFixture as fixture,
  nativeFacts,
  documentFacts,
  readResource,
  rpc,
  fixtures,
  sql,
  q,
} from "../integration/schedule-resource-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
import {
  scheduleResourcePurposes,
  scheduleResourceLabels,
  type ScheduleResourcePurpose,
} from "../../src/lib/schedules/resource-preparations";

test.setTimeout(150_000);
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
const drawer = (page: Page, name: string) =>
  page.getByRole("dialog", { name, exact: true });
const editorTitle = (purpose: ScheduleResourcePurpose) =>
  purpose === "shift_type_edit"
    ? "Tipo de plantão"
    : purpose === "schedule_series_end"
      ? "Encerrar programação"
      : purpose === "schedule_shift_edit"
        ? "Alteração pontual"
        : scheduleResourceLabels[purpose];
async function login(page: Page, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await button(page, "Entrar").click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
  await page.goto("/escalas");
  await expect(
    page.getByRole("heading", { name: "Escalas e plantões", exact: true }),
  ).toBeVisible();
}
async function peerContext(browser: Browser) {
  const use = test.info().project.use;
  return browser.newContext({
    baseURL: use.baseURL,
    viewport: use.viewport,
    deviceScaleFactor: use.deviceScaleFactor,
    isMobile: use.isMobile,
    hasTouch: use.hasTouch,
    userAgent: use.userAgent,
    extraHTTPHeaders: use.extraHTTPHeaders,
    serviceWorkers: "block",
  });
}
async function open(
  page: Page,
  purpose: ScheduleResourcePurpose,
  own = false,
  recovering = false,
) {
  if (own) {
    await page
      .getByText("Meus preenchimentos privados da agenda", { exact: true })
      .click();
    await button(page, "Consultar ou retomar este preenchimento").click();
  } else {
    await page
      .getByLabel("Data de referência", { exact: true })
      .fill("2100-04-01");
    if (purpose === "shift_type_edit" || purpose.startsWith("schedule_series_"))
      await page.getByText("Tipos e programações", { exact: true }).click();
    const names: Record<ScheduleResourcePurpose, string> = {
      shift_type_edit: "Editar tipo",
      schedule_series_end: "Encerrar série",
      schedule_series_approve: "Aprovar programação",
      schedule_series_reject: "Rejeitar programação",
      schedule_shift_edit: "Alterar plantão",
      schedule_change_approve: "Aprovar alteração",
      schedule_change_reject: "Rejeitar alteração",
      schedule_change_close: "Revisar proposta desatualizada",
    };
    await button(page, names[purpose]).filter({ visible: true }).click();
  }
  await expect(
    drawer(
      page,
      recovering ? "Recuperar confirmação da escala" : editorTitle(purpose),
    ),
  ).toBeVisible();
  await expect(button(page, "Atualizar preenchimento privado")).toBeEnabled();
}
async function fill(page: Page, purpose: ScheduleResourcePurpose) {
  const d = drawer(page, editorTitle(purpose));
  if (purpose === "shift_type_edit") {
    await d
      .getByLabel("Nome do plantão", { exact: true })
      .fill("Nome próprio da alteração guardada");
    await d
      .getByLabel("Disponível para novas escalas", { exact: true })
      .uncheck();
  } else {
    const label =
      purpose === "schedule_series_end" || purpose === "schedule_shift_edit"
        ? "Justificativa"
        : purpose === "schedule_series_reject"
          ? "Motivo da rejeição"
          : "Motivo desta decisão";
    await d
      .getByRole("textbox", { name: label, exact: true })
      .fill("Motivo próprio preservado entre aparelhos");
    if (purpose === "schedule_shift_edit")
      await d
        .getByLabel("Observações", { exact: true })
        .fill("Observação própria preservada entre aparelhos");
  }
}
async function review(page: Page) {
  await button(page, "Revisar alteração").click();
  const d = drawer(page, "Revisar escala");
  await expect(d).toBeVisible();
  await expect(d.locator("input,select,textarea")).toHaveCount(0);
  await expect(
    d.getByText("Sua edição atual ainda não foi salva no servidor.", {
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    d.getByRole("button", {
      name: "Descartar este preenchimento",
      exact: true,
    }),
  ).toBeDisabled();
  return d;
}
const confirm = (page: Page) =>
  drawer(page, "Revisar escala").getByRole("button", {
    name: /^(Confirmar gravação|Aprovar proposta|Confirmar rejeição|Encerrar proposta obsoleta)$/,
  });

for (const purpose of scheduleResourcePurposes)
  test(`resource preparation ${purpose} resumes another session and applies exactly the reviewed intent`, async ({
    page,
    browser,
  }, info) => {
    const f = await fixture(purpose),
      before = nativeFacts(f),
      docs = documentFacts(f);
    await login(page, f.patient);
    await open(page, purpose);
    await fill(page, purpose);
    await button(page, "Guardar e fechar").click();
    await expect(drawer(page, editorTitle(purpose))).not.toBeVisible();
    expect(nativeFacts(f)).toBe(before);
    expect(documentFacts(f)).toBe(docs);
    const context = await peerContext(browser),
      peer = await context.newPage();
    try {
      await login(peer, f.patient);
      await open(peer, purpose, true);
      const d = drawer(peer, editorTitle(purpose));
      await expect(d.locator("input,select,textarea")).toHaveCount(0);
      await button(peer, "Continuar rascunho").click();
      if (purpose === "shift_type_edit") {
        await expect(
          d.getByLabel("Nome do plantão", { exact: true }),
        ).toHaveValue("Nome próprio da alteração guardada");
        await expect(d.getByLabel("Início local", { exact: true })).toHaveValue(
          "19:00:37",
        );
        await expect(
          d.getByLabel("Disponível para novas escalas", { exact: true }),
        ).not.toBeChecked();
      } else
        await expect(
          d.getByRole("textbox").filter({ visible: true }).last(),
        ).toHaveValue("Motivo próprio preservado entre aparelhos");
      const reviewed = await review(peer);
      expect(nativeFacts(f)).toBe(before);
      await button(peer, "Voltar").click();
      await expect(button(peer, "Revisar alteração")).toBeFocused();
      await review(peer);
      if (
        [
          "shift_type_edit",
          "schedule_series_end",
          "schedule_shift_edit",
          "schedule_change_approve",
        ].includes(purpose)
      ) {
        for (const width of [320, 390, 768, 1440]) {
          await peer.setViewportSize({ width, height: 900 });
          expect(
            await reviewed.evaluate((el) => el.scrollWidth <= el.clientWidth),
          ).toBe(true);
          await audit(peer, `resource ${purpose} ${width}`);
        }
        await info.attach("resource review", {
          body: await reviewed.screenshot(),
          contentType: "image/png",
        });
      }
      const response = peer.waitForResponse(
        (r) =>
          new URL(r.url()).pathname ===
            "/api/schedules/resource-preparations/commit" &&
          r.request().method() === "POST",
      );
      await confirm(peer).click();
      const applied = await response;
      expect(applied.status()).toBe(200);
      const result = (await applied.json()).data.receipt;
      expect(result.purpose).toBe(purpose);
      expect(result.targetResourceId).toBe(f.target);
      expect(result.actorId).toBe(fixtures.adminA.id);
      await expect(peer.getByRole("dialog")).toHaveCount(0);
      const saved = await readResource(f);
      expect(saved.state).toBe("consumed");
      expect(saved.consumedResult).toEqual(result);
      expect(nativeFacts(f)).not.toBe(before);
      expect(documentFacts(f)).toBe(docs);
    } finally {
      await context.close();
    }
  });

test("resource lost native reply is recovered after reload without another operational write", async ({
  page,
}) => {
  const f = await fixture("schedule_change_reject"),
    purpose = "schedule_change_reject" as const,
    docs = documentFacts(f);
  await login(page, f.patient);
  await open(page, purpose);
  await fill(page, purpose);
  await review(page);
  const before = JSON.parse(nativeFacts(f));
  let writes = 0;
  let nativeStatus: number | undefined;
  page.on("request", (r) => {
    if (
      new URL(r.url()).pathname ===
        "/api/schedules/resource-preparations/commit" &&
      r.method() === "POST"
    )
      writes++;
  });
  await page.route(
    "**/api/schedules/resource-preparations/commit",
    async (route) => {
      const result = await route.fetch();
      await route.abort("failed");
      nativeStatus = result.status();
    },
    { times: 1 },
  );
  await confirm(page).click();
  await expect(
    page.getByRole("region", {
      name: "Confirmação de alteração da agenda",
      exact: true,
    }),
  ).toBeVisible();
  const key = `hca:schedule-resource:${fixtures.adminA.id}:${f.patient}:${purpose}:${f.target}`;
  expect(
    await page.evaluate((k) => sessionStorage.getItem(k), key),
  ).not.toBeNull();
  // The recovery panel can appear before the original native write completes.
  await expect.poll(() => nativeStatus).toBe(200);
  const after = nativeFacts(f);
  expect(JSON.parse(after)).toMatchObject({
    events: before.events + 1,
    commands: before.commands + 1,
    changes: expect.arrayContaining([
      expect.objectContaining({ id: f.target, status: "rejected" }),
    ]),
  });
  await page.reload();
  await page
    .getByText("Meus preenchimentos privados da agenda", { exact: true })
    .click();
  await button(page, "Consultar ou retomar este preenchimento").click();
  await expect(
    page.getByText("Operação da agenda registrada e conferida.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(writes).toBe(1);
  expect(nativeFacts(f)).toBe(after);
  expect(documentFacts(f)).toBe(docs);
  expect(await page.evaluate((k) => sessionStorage.getItem(k), key)).toBeNull();
});

test("resource unseen native attempt can be retired after lost resolution reply without replay", async ({
  page,
}) => {
  const f = await fixture(),
    purpose = "shift_type_edit" as const;
  await login(page, f.patient);
  await open(page, purpose);
  await fill(page, purpose);
  await review(page);
  const before = nativeFacts(f);
  let writes = 0;
  page.on("request", (r) => {
    if (
      new URL(r.url()).pathname ===
        "/api/schedules/resource-preparations/commit" &&
      r.method() === "POST"
    )
      writes++;
  });
  await page.route(
    "**/api/schedules/resource-preparations/commit",
    (route) => route.abort("failed"),
    { times: 1 },
  );
  await confirm(page).click();
  await button(page, "Consultar confirmação da escala").click();
  await expect(
    button(page, "Encerrar esta tentativa e preservar meus campos"),
  ).toBeEnabled();
  const localKey = `hca:schedule-resource:${fixtures.adminA.id}:${f.patient}:${purpose}:${f.target}`,
    original = JSON.parse(
      (await page.evaluate((k) => sessionStorage.getItem(k), localKey))!,
    );
  await page.route(
    "**/api/schedules/resource-preparations/recovery",
    async (route) => {
      if (!route.request().postDataJSON().resolutionKey) {
        await route.continue();
        return;
      }
      const result = await route.fetch();
      expect(result.status()).toBe(200);
      await route.abort("failed");
    },
    { times: 1 },
  );
  await button(page, "Encerrar esta tentativa e preservar meus campos").click();
  const preserved = JSON.parse(
    (await page.evaluate((k) => sessionStorage.getItem(k), localKey))!,
  );
  expect(preserved.resolutionKey).toBeTruthy();
  await page.reload();
  await open(page, purpose, true, true);
  await button(page, "Recuperar encerramento da tentativa").click();
  await expect(
    button(page, "Retomar meus campos após a conferência"),
  ).toBeEnabled();
  await button(page, "Retomar meus campos após a conferência").click();
  await button(page, "Manter minha edição para salvar nova revisão").click();
  await expect(
    drawer(page, editorTitle(purpose)).getByLabel("Nome do plantão", {
      exact: true,
    }),
  ).toHaveValue("Nome próprio da alteração guardada");
  const late = await page.request.post(
    "/api/schedules/resource-preparations/commit",
    { data: original.packet, headers: { Origin: new URL(page.url()).origin } },
  );
  expect(late.status()).toBe(409);
  expect(writes).toBe(1);
  expect(nativeFacts(f)).toBe(before);
});

test("resource private CAS preserves local fields and requires explicit adoption after source changes", async ({
  page,
  browser,
}) => {
  const f = await fixture();
  await login(page, f.patient);
  await open(page, "shift_type_edit");
  await fill(page, "shift_type_edit");
  await button(page, "Guardar preenchimento privado").click();
  const context = await peerContext(browser),
    peer = await context.newPage();
  try {
    await login(peer, f.patient);
    await open(peer, "shift_type_edit", true);
    await button(peer, "Continuar rascunho").click();
    await drawer(peer, editorTitle("shift_type_edit"))
      .getByLabel("Nome do plantão", { exact: true })
      .fill("Edição da segunda sessão");
    await button(peer, "Guardar preenchimento privado").click();
    await drawer(page, editorTitle("shift_type_edit"))
      .getByLabel("Nome do plantão", { exact: true })
      .fill("Minha edição depois da disputa");
    await button(page, "Guardar preenchimento privado").click();
    const panel = page.getByRole("region", {
      name: "Rascunho privado",
      exact: true,
    });
    await expect(
      panel.getByRole("region", { name: "Minha edição", exact: true }),
    ).toContainText("Minha edição depois da disputa");
    await expect(
      panel.getByRole("region", {
        name: "Versão salva no servidor",
        exact: true,
      }),
    ).toContainText("Edição da segunda sessão");
    await button(page, "Manter minha edição para salvar nova revisão").click();
    await button(page, "Guardar preenchimento privado").click();
    const version = JSON.parse(
      sql(
        `select to_jsonb(t) from public.shift_types t where id=${q(f.target)}`,
      ),
    ).version;
    await rpc(f.admin, "schedule_command", {
      p_patient: f.patient,
      p_action: "type",
      p_version: version,
      p_key: crypto.randomUUID(),
      p_body: {
        id: f.target,
        name: "Referência nativa avançada",
        startsLocal: "19:00:37",
        durationMinutes: 720,
        active: true,
      },
    });
    await button(page, "Atualizar referência da agenda").click();
    await expect(
      button(page, "Adotar referência atual e manter meus campos"),
    ).toBeVisible();
    await expect(button(page, "Revisar alteração")).toBeDisabled();
    await button(page, "Adotar referência atual e manter meus campos").click();
    await expect(
      drawer(page, editorTitle("shift_type_edit")).getByLabel(
        "Nome do plantão",
        { exact: true },
      ),
    ).toHaveValue("Minha edição depois da disputa");
    await review(page);
    await expect(drawer(page, "Revisar escala")).toContainText(
      "Minha edição depois da disputa",
    );
  } finally {
    await context.close();
  }
});

test("resource unseen private save stays reachable after target closure and cannot seal stale authority", async ({
  page,
}) => {
  const f = await fixture("schedule_change_reject"),
    purpose = "schedule_change_reject" as const;
  await login(page, f.patient);
  await open(page, purpose);
  await fill(page, purpose);
  await page.route(
    "**/api/schedules/resource-preparations",
    (route) => route.abort("failed"),
    { times: 1 },
  );
  await button(page, "Guardar preenchimento privado").click();
  await expect(button(page, "Recuperar salvamento ou descarte")).toBeVisible();
  await rpc(f.admin, "schedule_command", {
    p_patient: f.patient,
    p_action: "decide_change",
    p_version: f.reference.version,
    p_key: crypto.randomUUID(),
    p_body: {
      id: f.target,
      approve: false,
      reason: "Native closure after unseen private save",
    },
  });
  const before = nativeFacts(f);
  await page.reload();
  await page
    .getByText("Meus preenchimentos privados da agenda", { exact: true })
    .click();
  await button(page, "Consultar recuperação neste aparelho").click();
  await button(page, "Recuperar salvamento ou descarte").click();
  await expect(
    drawer(page, editorTitle(purpose)).getByRole("textbox", {
      name: "Motivo desta decisão",
      exact: true,
    }),
  ).toHaveValue("Motivo próprio preservado entre aparelhos");
  const row = await readResource(f);
  expect(row.content.reference).toBeNull();
  await expect(button(page, "Revisar alteração")).toBeDisabled();
  expect(nativeFacts(f)).toBe(before);
});

test("resource lost acknowledgement preserves another edition through completed history and device recovery", async ({
  page,
  browser,
}) => {
  const f = await fixture();
  await login(page, f.patient);
  await open(page, "shift_type_edit");
  await fill(page, "shift_type_edit");
  await button(page, "Guardar preenchimento privado").click();
  await expect(
    page.getByRole("region", { name: "Rascunho privado", exact: true }),
  ).toContainText("Revisão 1");
  const context = await peerContext(browser),
    peer = await context.newPage();
  try {
    await login(peer, f.patient);
    await open(peer, "shift_type_edit", true);
    await button(peer, "Continuar rascunho").click();
    await drawer(peer, editorTitle("shift_type_edit"))
      .getByLabel("Nome do plantão", { exact: true })
      .fill("Tipo concluído pela outra sessão");
    await review(peer);
    await confirm(peer).click();
    await expect(peer.getByRole("dialog")).toHaveCount(0);
    await drawer(page, editorTitle("shift_type_edit"))
      .getByLabel("Nome do plantão", { exact: true })
      .fill("Edição própria depois da outra conclusão");
    await button(page, "Atualizar preenchimento privado").click();
    await button(page, "Manter minha edição ao reconhecer o resultado").click();
    const before = nativeFacts(f);
    await page.route(
      "**/api/schedules/resource-preparations",
      async (route) => {
        expect(route.request().postDataJSON().action).toBe("acknowledge");
        const result = await route.fetch();
        expect(result.status()).toBe(200);
        await route.abort("failed");
      },
      { times: 1 },
    );
    await button(page, "Reconhecer resultado e manter minha edição").click();
    await expect(
      button(page, "Recuperar reconhecimento do resultado"),
    ).toBeVisible();
    await page.reload();
    await page
      .getByText("Meus preenchimentos privados da agenda", { exact: true })
      .click();
    await expect(
      page.getByText("Resultado reconhecido", { exact: false }),
    ).toBeVisible();
    await button(page, "Consultar recuperação neste aparelho").click();
    await button(page, "Recuperar reconhecimento do resultado").click();
    await expect(
      drawer(page, editorTitle("shift_type_edit")).getByLabel(
        "Nome do plantão",
        { exact: true },
      ),
    ).toHaveValue("Edição própria depois da outra conclusão");
    expect(nativeFacts(f)).toBe(before);
    await expect(
      button(page, "Adotar referência atual e manter meus campos"),
    ).toBeVisible();
  } catch (error) {
    await test.info().attach("peer recovery state", {
      body: await peer.locator("body").ariaSnapshot(),
      contentType: "text/plain",
    });
    await test.info().attach("peer recovery screenshot", {
      body: await peer.screenshot(),
      contentType: "image/png",
    });
    throw error;
  } finally {
    await context.close();
  }
});
