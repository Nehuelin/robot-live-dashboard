import { Metric } from "./Shared";
import { fmt, finiteNumber } from "../utils";
export function BatteryPanel({ bms = {} }) {
  const soc =
    finiteNumber(bms.soc) === null
      ? null
      : Math.max(0, Math.min(100, Number(bms.soc)));
  const cells = Array.isArray(bms.celdas) ? bms.celdas : [];
  const knownCells = cells.map(finiteNumber).filter((v) => v !== null);
  const delta =
    knownCells.length > 1 && knownCells.length === cells.length
      ? Math.max(...knownCells) - Math.min(...knownCells)
      : null;
  return (
    <div className="battery-content">
      <div className="battery-top">
        <div className="battery-main">
          <span className="battery-outline" aria-hidden="true">
            <span style={{ height: `${soc ?? 0}%` }} />
          </span>
          <div>
            <strong>
              {fmt(soc, 0)}
              <small>%</small>
            </strong>
            <span>ESTADO DE CARGA</span>
          </div>
        </div>
        <div className="battery-stats">
          <Metric label="CORRIENTE" value={fmt(bms.corriente, 0)} unit="mA" />
          <Metric label="TEMP. BMS" value={fmt(bms.temperatura)} unit="°C" />
          <Metric
            label="BALANCE"
            value={delta === null ? "—" : fmt(delta * 1000, 0)}
            unit="mV"
          />
        </div>
      </div>
      <div className="cell-heading">
        VOLTAJES DE CELDA <span>{cells.length || "—"} CELDAS</span>
      </div>
      <div className="cell-voltages">
        {cells.map((v, i) => (
          <div className="cell-voltage" key={i}>
            <span>C{i + 1}:</span>
            <b>
              {fmt(v, 2)}
              <small> V</small>
            </b>
          </div>
        ))}
        {!cells.length && (
          <p className="empty-note">Sin voltajes disponibles</p>
        )}
      </div>
    </div>
  );
}
