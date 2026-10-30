import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
export default defineConfig({
  resolve: { alias: { '@': resolve(process.cwd(), 'src') } },
  test: {
    environment: 'node',
    include: ['docs/audits/2026-10-30-phase-b5-integrations/evidence/*.test.ts'],
    setupFiles: ['docs/audits/2026-10-30-phase-b5-integrations/evidence/no-network.ts'],
    env: { NEXT_PUBLIC_APP_URL: 'https://care.example', NOTIFICATIONS_EXTERNAL_ENABLED: 'false', META_FLOWS_ENABLED: 'false' },
  },
});
