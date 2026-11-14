/** Canonical stroke paths shared by application controls and documentary markers. */
export const canonicalSymbols = {
  edit: "m4 16-1 5 5-1L21 7l-5-5z M14 4l6 6",
  history: "M4 4v5h5 M4 9a9 9 0 1 1-1 5 M12 7v6l4 2",
  clock: "M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M12 7v6l4 2",
  check: "m5 12 4 4 10-10",
  alert: "m12 3 10 18H2z M12 9v5 M12 18h.01",
} as const;
