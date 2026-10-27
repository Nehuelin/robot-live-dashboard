const paths = {
  maximize: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
  restore: "M8 3v5H3m18 0h-5V3M3 16h5v5m8 0v-5h5",
  panels: "M3 3h18v18H3zM3 10h18M12 10v11",
  robot:
    "M7 7h10a3 3 0 0 1 3 3v7H4v-7a3 3 0 0 1 3-3ZM12 3v4M8 11v2m8-2v2M8 17v4m8-4v4M1 11h3m16 0h3",
  motor:
    "M6 7h12v10H6zM9 3v4m6-4v4M9 17v4m6-4v4M2 10h4m-4 4h4m12-4h4m-4 4h4M10 10h4v4h-4z",
  cube: "m12 3 9 5v8l-9 5-9-5V8l9-5Zm0 10 9-5M12 13 3 8m9 5v8M7.5 5.5l9 5",
  capture:
    "M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  temperature: "M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0ZM12 8v9m7-10h2m-2 4h2",
  pulse: "M2 12h4l3-8 6 16 3-8h4",
  battery: "M3 7h16v10H3zM19 10h3v4h-3M7 10v4m4-4v4m4-4v4",
  compass: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM16 8l-3 5-5 3 3-5 5-3Z",
  contact: "M4 20h16M8 16v-5a4 4 0 0 1 8 0v5H8Zm4-13v2M4 7l2 2m14-2-2 2",
  orbit:
    "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM3 12C0 5 7 3 14 5s10 8 7 12-11 2-15-1M2 8l1 4 4-1",
  search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6",
  link: "m10 13 4-4M8 16l-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m4 0 2-2a4 4 0 1 1 6 6l-4 4a4 4 0 0 1-6 0",
};
export function Icon({ name, className = "" }) {
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.pulse} />
    </svg>
  );
}
