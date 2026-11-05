import {defineConfig} from 'vitest/config';
import {resolve} from 'node:path';
export default defineConfig({
 resolve:{alias:{'@':resolve(process.cwd(),'src')}},
 test:{environment:'node',include:['docs/audits/2026-10-30-phase-b7-operational-readiness/evidence/*.test.ts']},
});
