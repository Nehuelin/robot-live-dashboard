import { useMemo, useState } from "react";
import { fmt, temperatureClass } from "../utils";
import { Icon } from "./Icon";
export function MotorTable({ motors }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      motors.filter((m) =>
        m.nombre.toLowerCase().includes(query.toLowerCase()),
      ),
    [motors, query],
  );
  return (
    <div className="motors-content">
      <div className="motor-toolbar">
        <span>{filtered.length} ACTUADORES</span>
        <div className="search-input">
          <Icon name="search" />
          <input
            aria-label="Filtrar motores"
            placeholder="Filtrar articulación…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Tabla de motores desplazable"
      >
        <table>
          <thead>
            <tr>
              <th scope="col">ID / ARTICULACIÓN</th>
              <th scope="col">ÁNGULO</th>
              <th scope="col">VELOCIDAD</th>
              <th scope="col">TORQUE</th>
              <th scope="col">TEMP.</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((motor, index) => (
              <tr key={`${motor.id}-${index}`}>
                <td>
                  <small>{String(motor.id).padStart(2, "0")}</small>
                  <b>{motor.nombre}</b>
                </td>
                <td>{fmt(motor.angulo, 2)}°</td>
                <td>
                  {fmt(motor.velocidad, 2)}
                  <small> rad/s</small>
                </td>
                <td>
                  <span className="torque-bar" aria-hidden="true">
                    <i
                      style={{
                        width: `${motor.torque === null ? 0 : Math.min(100, Math.abs(motor.torque) * 10)}%`,
                      }}
                    />
                  </span>
                  {fmt(motor.torque, 2)}
                  <small> Nm</small>
                </td>
                <td>
                  <span
                    className={`temp-value ${temperatureClass(motor.temperatura)}`}
                  >
                    <i />
                    {fmt(motor.temperatura, 0)}°C
                  </span>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={5} className="table-empty">
                  {motors.length
                    ? "No hay articulaciones que coincidan con el filtro."
                    : "Esperando datos de los actuadores…"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="temperature-legend">
        <span>
          <i className="temp-green" /> &lt;40 °C
        </span>
        <span>
          <i className="temp-yellow" /> 40–60 °C
        </span>
        <span>
          <i className="temp-red" /> &gt;60 °C
        </span>
      </div>
    </div>
  );
}
