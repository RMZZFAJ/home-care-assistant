import { rpc } from "./api";
import { parseCatalogueWorkspace } from "@/lib/validation/catalogue-list";

export async function readCompleteCatalogue(client: Parameters<typeof rpc>[0], patient: string) {
  return parseCatalogueWorkspace(await rpc(client, "catalogue_workspace", { p_patient: patient }), patient);
}
