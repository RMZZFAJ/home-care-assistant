import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { setup, fixtures } from "../integration/v4-fixtures.mjs";
import { identityPhysicalState } from "../integration/catalogue-identity-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

test.setTimeout(240_000);
async function login(
  page: Page,
  patient: string,
  role: "adminA" | "professional",
) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures[role].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
}
const next = (page: Page) =>
  page.getByRole("button", { name: /^Avançar$|^Revisar$/ }).click();
const status = (page: Page) =>
  page.getByRole("status", {
    name: "Resultado da busca e seleção de materiais",
    exact: true,
  });
const selectedText = (count: number) =>
  `${count} ${count === 1 ? "material selecionado" : "materiais selecionados"}`;

for (const count of [1, 5, 20, 100]) {
  test.describe(`catálogo com ${count} itens`, () => {
    const definitions = Array.from({ length: count }, (_, i) => ({
      name: (
        `Material ${String(i + 1).padStart(3, "0")} ` +
        "IdentificaçãoExtensa".repeat(6) +
        " para seleção manual"
      ).slice(0, 158),
      category: ["medicamentos", "higiene", "dieta"][i % 3],
      unit: "unidade",
      aliases: [`Atalho ação ${String(i + 1).padStart(3, "0")}`],
    }));
    let f: Awaited<ReturnType<typeof setup>>, before: string;
    test.beforeAll(async () => {
      f = await setup({ catalogue: definitions });
      before = identityPhysicalState(f);
    });
    for (const type of ["REQ", "COM", "ENT"] as const) {
      test(`seleção em ${type} mantém alias, teclado, categoria e entrada manual`, async ({
        page,
      }, info) => {
        try {
          await login(
            page,
            f.patient,
            type === "REQ" ? "professional" : "adminA",
          );
          const catalog = await page.request.get(
            `/api/catalog?careRecipientId=${f.patient}`,
          );
          expect(catalog.ok()).toBe(true);
          expect((await catalog.json()).data).toHaveLength(count);
          await page.goto(
            `/fichas/${type.toLowerCase()}?careRecipientId=${f.patient}`,
          );
          if (type === "COM")
            await page
              .getByLabel("Forma de aquisição", { exact: false })
              .selectOption("purchase");
          if (type === "ENT") {
            const preparation = await page.request.get(
              `/api/documents/delivery-preparation?careRecipientId=${f.patient}&source=FAMILY`,
            );
            expect(preparation.ok()).toBe(true);
            const person = (
              (await preparation.json()).data.people as {
                id: string;
                name: string;
              }[]
            ).find((row) => row.id === fixtures.professional.id);
            if (!person)
              throw new Error(
                "The controlled ENT fixture requires its authorized eligible recipient",
              );
            const receiver = page.getByRole("combobox", {
              name: "Destinatário designado",
              exact: true,
            });
            await receiver.click();
            await expect(receiver).toBeInViewport({ ratio: 1 });
            await receiver.fill(person.name);
            await receiver.press("ArrowDown");
            await page
              .getByRole("option", { name: person.name, exact: true })
              .click();
            await page
              .getByLabel("Justificativa da escolha do recebedor", {
                exact: true,
              })
              .fill(
                "Escolha manual fictícia para percorrer a seleção de materiais",
              );
          }
          await next(page);
          await expect(
            page.getByRole("heading", { name: "Medicamentos", exact: true }),
          ).toBeVisible();
          const filter = () =>
            page.getByLabel(
              type === "REQ"
                ? "Buscar produto"
                : "Buscar materiais nesta categoria",
              { exact: true },
            );
          const choice = (index: number) =>
            page.getByRole("checkbox", {
              name: definitions[index].name + " unidade",
              exact: true,
            });
          await filter().click();
          await filter().fill("  ATALHO--AÇÃO--001  ");
          await expect(choice(0)).toBeVisible();
          await expect(status(page)).toContainText("1 material encontrado");
          await filter().focus();
          await page.keyboard.press("Tab");
          await expect(choice(0)).toBeFocused();
          await page.keyboard.press("Space");
          await expect(choice(0)).toBeChecked();
          await expect(status(page)).toContainText(selectedText(1));
          if (type !== "REQ")
            await page
              .getByRole("textbox", {
                name: "Quantidade — " + definitions[0].name,
                exact: true,
              })
              .fill("1");
          await filter().fill("Sem correspondência no catálogo");
          await expect(status(page)).toContainText("0 materiais encontrados");
          await expect(status(page)).toContainText(selectedText(1));
          await filter().fill(definitions[0].aliases[0]);
          await expect(choice(0)).toBeChecked();
          await next(page);
          await expect(
            page.getByRole("heading", { name: "Higiene", exact: true }),
          ).toBeVisible();
          await expect(status(page)).toContainText(selectedText(1));
          if (count > 1) {
            await filter().fill(definitions[1].aliases[0]);
            await expect(choice(1)).not.toBeChecked();
            await filter().focus();
            await page.keyboard.press("Tab");
            await expect(choice(1)).toBeFocused();
            await page.keyboard.press("Space");
            if (type !== "REQ")
              await page
                .getByRole("textbox", {
                  name: "Quantidade — " + definitions[1].name,
                  exact: true,
                })
                .fill("2");
            await expect(status(page)).toContainText(selectedText(2));
          }
          await page
            .getByRole("navigation", {
              name:
                type === "REQ" ? "Etapas da requisição" : "Etapas da " + type,
              exact: true,
            })
            .getByRole("button", { name: /Medicamentos/ })
            .click();
          await filter().fill(definitions[0].aliases[0]);
          await expect(choice(0)).toBeChecked();
          if (type !== "REQ")
            await expect(
              page.getByRole("textbox", {
                name: "Quantidade — " + definitions[0].name,
                exact: true,
              }),
            ).toHaveValue("1");
          await expect(status(page)).toContainText(
            selectedText(count > 1 ? 2 : 1),
          );
          for (const width of [320, 390, 768, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            // Measure the responsive composition from its beginning; a retained
            // offset can leave an unrelated control halfway under the header.
            await page.evaluate(() => window.scrollTo(0, 0));
            await audit(page, `catalogue-${count}-${type}-${width}`);
          }
          mkdirSync("output/playwright/phase-d", { recursive: true });
          await page.setViewportSize({ width: 320, height: 900 });
          await page.screenshot({
            path: `output/playwright/phase-d/catalogue-${count}-${type}-${info.project.name}.png`,
            fullPage: true,
          });
          for (let step = 1; step < (type === "REQ" ? 6 : 5); step++)
            await next(page);
          await expect(
            page.getByRole("heading", { name: "Revisão", exact: true }),
          ).toBeVisible();
          await expect(
            page.getByText(definitions[0].name, { exact: false }).first(),
          ).toBeVisible();
          if (count > 1)
            await expect(
              page.getByText(definitions[1].name, { exact: false }).first(),
            ).toBeVisible();
          for (const width of [320, 390, 768, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            await audit(page, `catalogue-review-${count}-${type}-${width}`);
          }
          const after = identityPhysicalState(f),
            requestCount = Number(
              sql(
                `select count(*) from public.requisitions where care_recipient_id=${sqlLiteral(f.patient)};`,
              ),
            );
          expect(after).toBe(before);
          expect(requestCount).toBe(0);
          await info.attach("catalogue-scale-independent-state", {
            body: JSON.stringify(
              {
                patient: f.patient,
                expectedCount: count,
                materialIds: f.products,
                requestCount,
                beforeSha256: createHash("sha256").update(before).digest("hex"),
                afterSha256: createHash("sha256").update(after).digest("hex"),
              },
              null,
              2,
            ),
            contentType: "application/json",
          });
        } catch (failure) {
          mkdirSync("output/playwright/phase-d", { recursive: true });
          await info.attach(`catalogue-${count}-${type}-failed-page`, {
            body: JSON.stringify(
              {
                url: page.url(),
                headings: await page.getByRole("heading").allTextContents(),
              },
              null,
              2,
            ),
            contentType: "application/json",
          });
          await page.screenshot({
            path: `output/playwright/phase-d/catalogue-${count}-${type}-${info.project.name}-failure.png`,
            fullPage: true,
          });
          throw failure;
        }
      });
    }
  });
}
