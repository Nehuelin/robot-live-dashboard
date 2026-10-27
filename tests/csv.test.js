import { describe, it, expect, vi } from "vitest";
import { CSV_HEADERS, samplesToCSV, downloadSamples } from "../src/csv";
import { telemetry } from "./fixtures";

// Independent reader checks escaping and logical rows, including embedded newlines.
function parseCSV(text) {
  const rows = [];
  let row = [],
    value = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(value);
      value = "";
    } else if (c === "\n" && !quoted) {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else value += c;
  }
  row.push(value);
  rows.push(row);
  return rows;
}
describe("CSV compatibility", () => {
  it("preserves all 14 headers in their original order", () => {
    expect(CSV_HEADERS.join(",")).toBe(
      "ts,modelo,imu_roll,imu_pitch,imu_yaw,imu_ax,imu_ay,imu_az,bms_soc,bms_corriente,bms_temp,bms_celdas,fuerzas,motores",
    );
  });
  it("exports nothing for zero samples", () =>
    expect(samplesToCSV([])).toBe(""));
  it.each([1, 10, 10000])(
    "exports %i samples with complete columns",
    (count) => {
      const rows = parseCSV(
        samplesToCSV(
          Array.from({ length: count }, (_, i) =>
            telemetry(i % 2 ? "g1" : "go2", i),
          ),
        ),
      );
      expect(rows).toHaveLength(count + 1);
      expect(rows.every((row) => row.length === 14)).toBe(true);
      expect(rows.at(-1)[0]).toBe(String(count - 1));
    },
  );
  it("round-trips JSON, Unicode and delimiters without altering objects", () => {
    const data = telemetry();
    data.modelo = 'modelo,"especial"\r\nGo2';
    data.motores[0].nombre = 'articulación,"X"\nsalto';
    data.bms.soc = 0;
    const row = parseCSV(samplesToCSV([data]))[1];
    expect(row[1]).toBe(data.modelo);
    expect(row[8]).toBe("0");
    expect(row[9]).toBe("-1200");
    expect(JSON.parse(row[11])).toEqual(data.bms.celdas);
    expect(JSON.parse(row[12])).toEqual(data.fuerzas);
    expect(JSON.parse(row[13])).toEqual(data.motores);
  });
  it("exports unknown measurements as empty cells, not zero", () => {
    const data = telemetry();
    data.imu.pitch = null;
    expect(parseCSV(samplesToCSV([data]))[1][3]).toBe("");
  });
  it("downloads in the browser and releases its temporary URL", () => {
    vi.useFakeTimers();
    const create = vi.fn(() => "blob:test"),
      revoke = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    downloadSamples([telemetry()]);
    expect(click).toHaveBeenCalledOnce();
    expect(create.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(document.querySelector("a[download]")).toBeNull();
    vi.advanceTimersByTime(1000);
    expect(revoke).toHaveBeenCalledWith("blob:test");
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});
