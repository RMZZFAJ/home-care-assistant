import { defineConfig } from 'vitest/config';
export default defineConfig({
 test:{environment:'node',include:['docs/audits/2026-10-30-phase-b6-documents/evidence/*.test.ts'],testTimeout:120000},
 resolve:{alias:{'@':`${import.meta.dirname}/../../../../src`}},
});
