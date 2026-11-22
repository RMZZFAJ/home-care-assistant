import { setTimeout } from "node:timers/promises";

function hasLocalPortCollision(result) {
  return (
    result.status !== 0 &&
    /failed to start docker container "supabase_[a-z_]+_home-care-assistant":/.test(result.stderr ?? "") &&
    /failed to bind host port [^\s]+:5432[0-9]\/tcp: address already in use/.test(result.stderr ?? "")
  );
}

// Retry only the observed Docker bind collision, before migrations or fixtures.
// Keep the same verified project and preserve the final CLI failure unchanged.
export async function startLocalWithPortRetry(run, { wait = setTimeout, onRetry = () => {} } = {}) {
  const delays = [15_000, 30_000];
  for (let attempt = 0; ; attempt++) {
    const result = run();
    if (!hasLocalPortCollision(result) || attempt === delays.length) return result;
    onRetry(attempt + 2, delays[attempt]);
    await wait(delays[attempt]);
  }
}
