import React, { useState, useMemo } from 'react';
import { fmt } from '../utils';

export function MotorTable({ motors }) {
  const [query, setQuery] = useState('');
  
  const filtered = useMemo(() => 
    motors.filter((m) => m.nombre.toLowerCase().includes(query.toLowerCase())), 
  [motors, query]);
  
  const getTempClass = (temp) => {
    if (temp < 40) return 'temp-green';
    if (temp <= 60) return 'temp-yellow';
    return 'temp-red';
  };

  return (
    <div className="motors-content">
      <div className="motor-toolbar">
        <span>{filtered.length} ACTUADORES</span>
        <input 
          aria-label="Filtrar motores" 
          placeholder="Filtrar articulación…" 
          value={query} 
          onChange={(e) => setQuery(e.target.value)} 
        />
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>ID / ARTICULACIÓN</th>
              <th>ÁNGULO</th>
              <th>VELOCIDAD</th>
              <th>TORQUE</th>
              <th>TEMP.</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((motor) => {
              const load = Math.min(100, Math.abs(motor.torque) * 10);
              return (
                <tr key={motor.id}>
                  <td>
                    <small>{String(motor.id).padStart(2, '0')}</small>
                    <b>{motor.nombre}</b>
                  </td>
                  <td>{fmt(motor.angulo, 2)}°</td>
                  <td>{fmt(motor.velocidad, 2)} <small>rad/s</small></td>
                  <td>
                    <span className="torque-bar"><i style={{ width: `${load}%` }} /></span>
                    {fmt(motor.torque, 2)} <small>Nm</small>
                  </td>
                  <td className={getTempClass(motor.temperatura)}>
                    {fmt(motor.temperatura, 0)}°C
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
