import { vi } from "vitest";
vi.stubGlobal("fetch", () => { throw new Error("B8 probe forbids network"); });
