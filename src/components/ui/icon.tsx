import type { SVGProps } from "react";

// Canonical stroke paths from Home_Care_Assistant_Modelo_Integral.html.
const paths = {
  "home": "M3 10 12 3l9 7v11H3z M9 21v-8h6v8",
  "file": "M6 3h8l5 5v13H6z M14 3v5h5 M9 13h7 M9 17h7",
  "bell": "M5 17h14c-2-2-2-4-2-7a5 5 0 0 0-10 0c0 3 0 5-2 7 M10 21h4",
  "box": "m3 7 9-4 9 4v10l-9 4-9-4z M3 7l9 5 9-5 M12 12v9",
  "truck": "M2 6h13v12H2z M15 10h4l3 3v5h-7z M5 20h3 M17 20h3",
  "users": "M6 7a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M2 21v-2a7 7 0 0 1 14 0v2 M17 5a3 3 0 0 1 0 6 M18 15a5 5 0 0 1 4 5",
  "check": "m5 12 4 4 10-10",
  "clock": "M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M12 7v6l4 2",
  "refresh": "M20 11A8 8 0 0 0 6 5L3 8 M3 3v5h5 M4 13a8 8 0 0 0 14 6l3-3 M21 21v-5h-5",
  "plus": "M12 5v14 M5 12h14",
  "search": "M3 10a7 7 0 1 0 14 0a7 7 0 1 0-14 0 M15 15l6 6",
  "arrow": "M4 12h16 M14 6l6 6-6 6",
  "chevron": "m9 5 7 7-7 7",
  "down": "m6 9 6 6 6-6",
  "more": "M5 12h.01 M12 12h.01 M19 12h.01",
  "settings": "M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0",
  "shield": "m12 3 8 3v6c0 5-4 8-8 10-4-2-8-5-8-10V6z M8 12l3 3 5-6",
  "note": "M5 4h14v16H5z M9 8h6 M9 12h6 M9 16h3",
  "link": "m9 15 6-6 M8 16H6a4 4 0 0 1 0-8h4 M14 8h4a4 4 0 0 1 0 8h-4",
  "download": "M12 3v13 M8 12l4 4 4-4 M4 18v3h16v-3",
  "upload": "M12 17V4 M8 8l4-4 4 4 M4 18v3h16v-3",
  "calendar": "M4 5h16v16H4z M4 10h16 M8 3v4 M16 3v4 M8 14h2 M14 14h2 M8 18h2",
  "heart": "M12 21C-3 12 3 1 12 7c9-6 15 5 0 14",
  "alert": "m12 3 10 18H2z M12 9v5 M12 18h.01",
  "info": "M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M12 11v6 M12 7h.01",
  "history": "M4 4v5h5 M4 9a9 9 0 1 1-1 5 M12 7v6l4 2",
  "archive": "M3 4h18v5H3z M5 9v12h14V9 M10 14h4",
  "lock": "M6 10h12v11H6z M8 10V7a4 4 0 0 1 8 0v3",
  "edit": "m4 16-1 5 5-1L21 7l-5-5z M14 4l6 6",
  "image": "M3 4h18v16H3z M3 17l6-6 4 4 3-3 5 5 M14 8h.01",
  "eye": "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0",
  "layers": "m3 8 9-5 9 5-9 5z M3 12l9 5 9-5 M3 16l9 5 9-5",
  "phone": "M7 2h10v20H7z M10 18h4",
  "sliders": "M4 7h16 M4 17h16 M8 4v6 M16 14v6",
  "logout": "M10 3H4v18h6 M10 12h11 M16 7l5 5-5 5",
  "chart": "M4 3v18h17 M8 17v-5 M13 17V8 M18 17V5",
  "help": "M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5 M12 18h.01",
  "menu": "M4 6h16 M4 12h16 M4 18h16",
  "close": "M6 6l12 12 M18 6 6 18",
  "camera": "M3 7h5l2-3h4l2 3h5v14H3z M8 13a4 4 0 1 0 8 0a4 4 0 1 0-8 0",
  "user": "M8 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M4 21v-2a8 8 0 0 1 16 0v2",
  "forms": "M6 3h8l5 5v13H6z M14 3v5h5 M9 13h7 M9 17h7",
  "stock": "m3 7 9-4 9 4v10l-9 4-9-4z M3 7l9 5 9-5 M12 12v9",
  "team": "M6 7a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M2 21v-2a7 7 0 0 1 14 0v2 M17 5a3 3 0 0 1 0 6 M18 15a5 5 0 0 1 4 5"
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, className, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={["hca-icon", className].filter(Boolean).join(" ")} {...props}><path d={paths[name]} /></svg>;
}
