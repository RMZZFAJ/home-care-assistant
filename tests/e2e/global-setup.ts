import { getE2EEnvironment } from "../../scripts/e2e-environment.mjs";

export default function setupE2EEnvironment() {
  // Execution initializes workers; config discovery has no backend side effects.
  Object.assign(process.env, getE2EEnvironment());
}
