export const CSV_HEADERS = [
  "ts",
  "modelo",
  "imu_roll",
  "imu_pitch",
  "imu_yaw",
  "imu_ax",
  "imu_ay",
  "imu_az",
  "bms_soc",
  "bms_corriente",
  "bms_temp",
  "bms_celdas",
  "fuerzas",
  "motores",
];
const cell = (value) => {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const jsonCell = (value) => `"${JSON.stringify(value).replace(/"/g, '""')}"`;
export function samplesToCSV(samples) {
  if (!samples.length) return "";
  return [
    CSV_HEADERS.join(","),
    ...samples.map((m) =>
      [
        ...[
          m.ts,
          m.modelo,
          m.imu?.roll,
          m.imu?.pitch,
          m.imu?.yaw,
          m.imu?.ax,
          m.imu?.ay,
          m.imu?.az,
          m.bms?.soc,
          m.bms?.corriente,
          m.bms?.temperatura,
        ].map(cell),
        jsonCell(m.bms?.celdas || []),
        jsonCell(m.fuerzas || {}),
        jsonCell(m.motores || []),
      ].join(","),
    ),
  ].join("\n");
}
export function downloadSamples(samples) {
  const csv = samplesToCSV(samples);
  if (!csv) return;
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `muestras_telemetria_${Date.now()}.csv`;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
