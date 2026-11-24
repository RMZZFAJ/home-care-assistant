import { parseProfilesPage } from "@/lib/validation/catalogue-list";

type Profile = ReturnType<typeof parseProfilesPage>["data"][number];
/** A search is published only when every matching authorized page has arrived. */
export async function readProfileDirectory(read: (page: number) => Promise<unknown>, signal: AbortSignal, query = "") {
  const people: Profile[] = [];
  const ids = new Set<string>();
  let total: number | null = null;
  for (let page = 1; ; page++) {
    signal.throwIfAborted();
    const result = parseProfilesPage(await read(page), page, query);
    signal.throwIfAborted();
    total ??= result.total;
    if (result.total !== total || result.data.some(person => ids.has(person.id)))
      throw new Error("O diretório mudou durante a consulta. Consulte as pessoas novamente antes de escolher.");
    for (const person of result.data) { ids.add(person.id); people.push(person); }
    if (people.length === total) return people;
  }
}
