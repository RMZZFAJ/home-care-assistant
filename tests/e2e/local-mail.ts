import { expect, type Page } from "@playwright/test";

export async function confirmationLink(page: Page, email: string, subject: string) {
  let id: string | undefined;
  await expect.poll(async () => {
    const response = await page.request.get("http://127.0.0.1:54324/api/v1/messages");
    const body = await response.json();
    const message = body.messages.find((item: {
      ID: string; Subject: string; To: Array<{ Address: string }>;
    }) => item.Subject.includes(subject) && item.To.some(to => to.Address === email));
    id = message?.ID;
    return Boolean(id);
  }).toBe(true);
  const response = await page.request.get(`http://127.0.0.1:54324/api/v1/message/${id}`);
  const message = await response.json();
  const link = String(message.HTML).match(/href="([^"]+)"/)?.[1].replaceAll("&amp;", "&");
  if (!link || new URL(link).origin !== "http://127.0.0.1:54321")
    throw new Error("Confirmation must target only the local development Auth service.");
  return link;
}
