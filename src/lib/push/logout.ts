/** Logout always proceeds to Auth revocation, even when optional Push cleanup fails. */
export async function detachPushForLogout(): Promise<void> {
  try {
    await fetch("/api/push/session", {
      method: "POST",
      credentials: "same-origin",
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    /* Auth signOut remains the authoritative session invalidation. */
  }
  try {
    if (!("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager?.getSubscription();
    await subscription?.unsubscribe();
    const notifications = await registration?.getNotifications();
    for (const notification of notifications ?? []) notification.close();
  } catch {
    /* A later send still requires the current database session. */
  }
}
