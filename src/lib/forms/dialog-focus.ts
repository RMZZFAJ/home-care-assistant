/** Keep a stable focus owner while a dialog removes the activating control. */
export function holdDialogFocus(control: HTMLElement) {
  control
    .closest<HTMLElement>('[role="dialog"]')
    ?.focus({ preventScroll: true });
}
